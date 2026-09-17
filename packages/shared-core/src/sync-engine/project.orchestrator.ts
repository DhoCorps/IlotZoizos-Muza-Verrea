import { ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IProject, CAPABILITIES, ActionSignature } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { v4 as uuidv4 } from 'uuid';

interface IStorageManager {
  deleteFile(key: string): Promise<any>;
  extractKeyFromUrl(url: string): string;
}

export interface ProjectSyncResult {
  success: boolean;
  status: string;
  project?: IProject;
  mongo?: any;
  neo4j?: any;
  purgedCount?: number;
}

/**
 * PROJECT ORCHESTRATOR 
 * Phase 2 (UID Canonique) & Phase 3 (Éradication des verrous longs en cascade).
 */
export class ProjectOrchestrator {
  private storageService: IStorageManager;

  constructor(customStorageService?: IStorageManager) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }

  // --- 🧱 FONDATION : CRÉATION DU CHANTIER (ANCRAGE DOUBLE) ---
  async fosterProject(
    projectData: IProject,
    signature: ActionSignature
  ): Promise<ProjectSyncResult> {
    
    if (!signature.capabilities.includes(CAPABILITIES.PROJECT.CREATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour sceller un chantier", "FORBIDDEN", 403);
    }

    const teamUid = projectData.ownerUid;
    const actorUid = signature.actorUid;
    
    if (!teamUid) {
      throw new IlotError("Un chantier doit être ancré à un Nid (ownerUid manquant).", "BAD_REQUEST", 400);
    }

    const uid = projectData.uid || uuidv4();

    return await TransactionManager.execute("Fondation Chantier", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      const finalProjectData = {
        ...projectData,
        uid,
        ownerUid: teamUid,
        creatorUid: actorUid,
        documents: projectData.documents || [],
        slug: projectData.slug || uid,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      const [newProject] = await ProjectModel.create([finalProjectData], { session: mongoSession });

      const cypher = `
        MATCH (u:User { uid: $actorUid })
        MATCH (t:Team { uid: $teamUid })
        CREATE (p:Project {
          uid: $uid,
          name: $name,
          slug: $slug,
          createdAt: datetime($now),
          updatedAt: datetime($now),
          status: $status
        })
        CREATE (u)-[:CREATED { at: datetime($now) }]->(p)
        CREATE (t)-[:HAS_PROJECT]->(p)
        RETURN p
      `;
      
      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorUid,
        teamUid: teamUid,
        uid: uid,
        name: newProject.name,
        slug: newProject.slug,
        status: newProject.status || 'CONCEPT',
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du scelllement : Utilisateur ou Nid introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newProject,
        neo4j: neoResult
      };
    });
  }

  // --- 🧬 MUTATION (Update) ---
  async mutateProject(projectIdentifier: string, updates: any, signature: ActionSignature): Promise<ProjectSyncResult> {
    const project = await findEntityBySlugOrUid(ProjectModel, projectIdentifier);
    if (!project) throw new IlotError("Chantier introuvable dans la Silice.", "NOT_FOUND", 404);

    const projectUid = (project as any).uid;

    return await TransactionManager.execute("Mutation Chantier", async (_mongoSession, neo4jTx) => {
      const now = new Date();
      
      const isCreator = (project as any).creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');

      if (!isCreator && !isArchitect) {
        const check = await neo4jTx.run(`
          MATCH (u:User {uid: $actorUid})-[r:MEMBER_OF|OWNER_OF]->(t:Team)-[:HAS_PROJECT]->(p:Project {uid: $pUid})
          RETURN r.capabilities AS caps
        `, { actorUid: signature.actorUid, pUid: projectUid });

        const record = check.records[0];
        const capsFromGraph = record ? record.get('caps') : [];
        const userCapsOnTeam = Array.isArray(capsFromGraph) ? capsFromGraph : [];

        const hasTeamRight = userCapsOnTeam.includes(CAPABILITIES.PROJECT.UPDATE) || userCapsOnTeam.includes('*');

        if (!hasTeamRight) {
          throw new IlotError("Aura insuffisante sur ce territoire.", "FORBIDDEN", 403);
        }
      }

      const updatedProject = await ProjectModel.findOneAndUpdate(
        { uid: projectUid }, 
        { $set: { ...updates, "dates.updatedAt": now } }, 
        { new: true }
      ).lean();

      await neo4jTx.run(`
        MATCH (p:Project {uid: $projectUid})
        SET p.name = coalesce($name, p.name),
            p.status = coalesce($status, p.status),
            p.updatedAt = datetime($now)
      `, { 
        projectUid, 
        name: updates.name || null, 
        status: updates.status || null, 
        now: now.toISOString() 
      });

      return { success: true, status: 'success', mongo: updatedProject, neo4j: null };
    });
  }

  /**
   * 🌋 DISSOLUTION GLOBALE DU CHANTIER (Phase 3 : Éradication des verrous longs & Memory Spikes)
   * Utilise des curseurs Mongoose et un traitement par lots incrémentiels pour préserver la RAM.
   */
  async dissolveProject(projectIdentifier: string, _signature: ActionSignature) {
    const project = await findEntityBySlugOrUid(ProjectModel, projectIdentifier);
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);
    
    const projectUid = (project as any).uid;

    return await TransactionManager.execute("Désintégration Totale", async (mongoSession, neo4jTx) => {
      
      // 1. Identification de l'arbre complet DANS la transaction
      const hierarchyResult = await neo4jTx.run(`
        MATCH (root:Project {uid: $projectUid})
        OPTIONAL MATCH (root)-[:CONTAINS*0..]->(sub:Project)
        OPTIONAL MATCH (sub)<-[:TASK_OF]-(t:Task)
        RETURN collect(DISTINCT sub.uid) AS projUids, collect(DISTINCT t.uid) AS taskUids
      `, { projectUid });

      const record = hierarchyResult.records[0];
      const projUids: string[] = record ? record.get('projUids') : [];
      const taskUids: string[] = record ? record.get('taskUids') : [];
      
      const allUids = [...projUids, ...taskUids];
      if (allUids.length === 0) return { success: true, purgedCount: 0 };

      // 2. Traitement par lots incrémentiels via curseurs Mongoose (anti Memory Spikes)
      const batchSize = 50;
      let filesBatch: string[] = [];

      const processBatch = async (files: string[]) => {
        if (files.length === 0) return;
        await Promise.all(
          files.map(async (key) => {
            try {
              await this.storageService.deleteFile(key);
            } catch (err) {
              console.error(`  [Orchestrator] Échec purge fichier ${key} :`, err);
            }
          })
        );
      };

      if (taskUids.length > 0) {
        const taskCursor = TaskModel.find({ uid: { $in: taskUids } }).select('documents').session(mongoSession).cursor();
        for await (const task of taskCursor) {
          if ((task as any).documents && Array.isArray((task as any).documents)) {
            for (const doc of (task as any).documents) {
              if (doc.url) {
                filesBatch.push(this.storageService.extractKeyFromUrl(doc.url));
                if (filesBatch.length >= batchSize) {
                  await processBatch(filesBatch);
                  filesBatch = [];
                }
              }
            }
          }
        }
      }

      if (projUids.length > 0) {
        const projCursor = ProjectModel.find({ uid: { $in: projUids } }).select('documents').session(mongoSession).cursor();
        for await (const proj of projCursor) {
          if ((proj as any).documents && Array.isArray((proj as any).documents)) {
            for (const doc of (proj as any).documents) {
              if (doc.url) {
                filesBatch.push(this.storageService.extractKeyFromUrl(doc.url));
                if (filesBatch.length >= batchSize) {
                  await processBatch(filesBatch);
                  filesBatch = [];
                }
              }
            }
          }
        }
      }

      if (filesBatch.length > 0) {
        await processBatch(filesBatch);
      }

      // 3. Purge Documentaire Massive (Silice)
      if (taskUids.length > 0) {
        await TaskModel.deleteMany({ uid: { $in: taskUids } }, { session: mongoSession });
      }
      if (projUids.length > 0) {
        await ProjectModel.deleteMany({ uid: { $in: projUids } }, { session: mongoSession });
      }

      // 4. Purge Relationnelle Massive (Matrice)
      await neo4jTx.run(`
        MATCH (n) WHERE n.uid IN $allUids
        DETACH DELETE n
      `, { allUids });
      
      return { success: true, status: 'success', purgedCount: allUids.length };
    });
  }

  // --- 🖇️ ATTACHEMENT : AJOUT DE FICHIERS ---
  async appendFiles(
    projectIdentifier: string,
    fileUrls: string[],
    signature: ActionSignature
  ) {
    if (!signature.capabilities.includes(CAPABILITIES.PROJECT.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour injecter des données dans ce chantier.", "FORBIDDEN", 403);
    }

    const project = await findEntityBySlugOrUid(ProjectModel, projectIdentifier);
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);

    const now = new Date();

    const updated = await ProjectModel.findOneAndUpdate(
      { uid: (project as any).uid },
      { $push: { fileUploads: { $each: fileUrls } }, $set: { "dates.lastActivity": now, "dates.updatedAt": now } },
      { new: true }
    );
    
    if (!updated) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);
    return updated;
  }
}
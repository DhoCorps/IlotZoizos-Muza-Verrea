// packages/shared-core/src/sync-engine/project.orchestrator.ts
import { ProjectModel, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { IProject, CAPABILITIES, ActionSignature } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';
import { randomUUID } from 'crypto';
import { IlotError } from '../errors/ilot.errors';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectSyncResult {
  success: boolean;
  status: string;
  project?: IProject; 
  mongo?: any;
  neo4j?: any;
  purgedCount?: number;
}

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

/**
 * 🛰️ PROJECT ORCHESTRATOR 
 * Phase 2 (UID Canonique) & Phase 3 (Éradication des verrous longs en cascade).
 */
export class ProjectOrchestrator {

  // --- 🌟 FONDATION : CRÉATION DU CHANTIER (ANCRAGE DOUBLE) ---
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
      
      const finalProjectData = {
        ...projectData,
        uid,
        ownerUid: teamUid,
        creatorUid: actorUid,
        documents: projectData.documents || [],
        slug: projectData.slug || (projectData.name ? generateSlug(projectData.name) : uid)
      };

      const [newProject] = await ProjectModel.create([finalProjectData], { session: mongoSession });

      const cypher = `
        MATCH (u:User { uid: $actorUid })
        MATCH (t:Team { uid: $teamUid })
        CREATE (p:Project { 
          uid: $uid, 
          name: $name, 
          slug: $slug,
          createdAt: datetime(),
          status: $status 
        })
        CREATE (u)-[:CREATED { at: datetime() }]->(p)
        CREATE (t)-[:HAS_PROJECT]->(p)
        RETURN p
      `;
      
      const neoResult = await neo4jTx.run(cypher, { 
        actorUid: actorUid,
        teamUid: teamUid,
        uid: uid, 
        name: newProject.name,
        slug: newProject.slug,
        status: newProject.status || 'CONCEPT'
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du scellement : Utilisateur ou Nid introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { 
        success: true, 
        status: 'success', 
        mongo: newProject, 
        neo4j: neoResult 
      };
    });
  }

  // --- 🎨 MUTATION (Update) ---
  async mutateProject(projectIdentifier: string, updates: any, signature: ActionSignature): Promise<ProjectSyncResult> {
    // 1. Résolution universelle vers UID canonique strict (Phase 2)
    const project = await ProjectModel.findOne({ $or: [{ slug: projectIdentifier }, { uid: projectIdentifier }] });
    if (!project) throw new IlotError("Chantier introuvable dans la Silice.", "NOT_FOUND", 404);

    const projectUid = project.uid;

    return await TransactionManager.execute("Mutation Chantier", async (mongoSession, neo4jTx) => {
      
      const isCreator = project.creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');

      // Vérification des droits via le graphe en cascade
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
        { uid: projectUid }, { $set: updates }, { new: true, session: mongoSession }
      ).lean();

      // Mutation légère Neo4j
      await neo4jTx.run(`
        MATCH (p:Project {uid: $projectUid})
        SET p.name = coalesce($name, p.name), 
            p.status = coalesce($status, p.status), 
            p.updatedAt = datetime()
      `, { projectUid, name: updates.name || null, status: updates.status || null });

      return { success: true, status: 'success', mongo: updatedProject, neo4j: null };
    });
  }

  /**
   * 🧨 DISSOLUTION GLOBALE DU CHANTIER (Phase 3 : Éradication des verrous longs)
   * Supprime l'intégralité de l'arbre (Sous-projets, Tâches) en une seule transaction massive 
   * plutôt que de boucler individuellement.
   */
  async dissolveProject(projectIdentifier: string, signature: ActionSignature) {
    const project = await ProjectModel.findOne({ $or: [{ slug: projectIdentifier }, { uid: projectIdentifier }] });
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);

    const projectUid = project.uid;

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

      // 2. Récupération des documents pour purge du stockage physique
      const tasksWithDocs = await TaskModel.find({ uid: { $in: taskUids } }).select('documents').session(mongoSession).lean();
      const projsWithDocs = await ProjectModel.find({ uid: { $in: projUids } }).select('documents').session(mongoSession).lean();
      
      const filesToDelete: string[] = [];
      [...tasksWithDocs, ...projsWithDocs].forEach((entity: any) => {
        if (entity.documents && Array.isArray(entity.documents)) {
          entity.documents.forEach((doc: any) => {
            if (doc.url) filesToDelete.push(storageService.extractKeyFromUrl(doc.url));
          });
        }
      });

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

      // 5. Nettoyage asynchrone du stockage S3/R2 (Best effort)
      for (const key of filesToDelete) {
        try {
          await storageService.deleteFile(key);
        } catch (err) {
          console.error(`⚠️ [Orchestrator] Échec purge fichier ${key} :`, err);
        }
      }
      
      return { success: true, status: 'success', purgedCount: allUids.length };
    });
  }

  // --- 📎 ATTACHEMENT : AJOUT DE FICHIERS ---
  async appendFiles(
    projectIdentifier: string, 
    fileUrls: string[], 
    signature: ActionSignature
  ) {
    if (!signature.capabilities.includes(CAPABILITIES.PROJECT.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour injecter des données dans ce chantier.", "FORBIDDEN", 403);
    }

    const project = await ProjectModel.findOne({ $or: [{ slug: projectIdentifier }, { uid: projectIdentifier }] });
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);

    const updated = await ProjectModel.findOneAndUpdate(
      { uid: project.uid }, 
      { $push: { fileUploads: { $each: fileUrls } }, $set: { "dates.lastActivity": new Date() } }, 
      { new: true }
    );
    
    if (!updated) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);
    return updated;
  }
}
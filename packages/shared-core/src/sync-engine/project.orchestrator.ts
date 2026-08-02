// packages/shared-core/src/sync-engine/project.orchestrator.ts
import { TeamModel } from '../../../infrastructure/src/database/models/nosql/team.model';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { TaskOrchestrator } from './task.orchestrator';
import { getNeo4jSession } from '../../../infrastructure/src/database/neo4j';
import { IProject } from '../../../types/src/models/project.types';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';
import { randomUUID } from 'crypto';
import { IlotError } from '../errors/ilot.errors';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectSyncResult {
  success: boolean;
  project?: IProject; 
  purgedCount?: number;
}

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};




/**
 * 🛰️ PROJECT ORCHESTRATOR 
 * Modèle : "Zero-Identity" - L'Orchestrateur exécute selon la Signature.
 */
export class ProjectOrchestrator {

  private taskOrch = new TaskOrchestrator();

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

      return { 
        success: true, 
        status: 'success', 
        mongo: newProject, 
        neo4j: neoResult 
      };
    });
  }

  // --- 🎨 MUTATION (Update) ---
  async mutateProject(projectUid: string, updates: any, signature: ActionSignature): Promise<ProjectSyncResult> {
    const project = await ProjectModel.findOne({ uid: projectUid });
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);

    return await TransactionManager.execute("Mutation Chantier", async (mongoSession, neo4jTx) => {
      
      const isCreator = project.creatorUid === signature.actorUid;
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
        { uid: projectUid }, { $set: updates }, { new: true, session: mongoSession }
      ).lean();

      await neo4jTx.run(`
        MATCH (p:Project {uid: $projectUid})
        SET p.name = $name, p.status = $status, p.updatedAt = datetime()
      `, { projectUid, name: updatedProject!.name, status: updatedProject!.status });

      return { success: true, status: 'success', mongo: updatedProject, neo4j: null };
    });
  }

private async getFullDeletionOrder(projectUid: string) {
  const session = getNeo4jSession();
  try {
    // On récupère le chemin complet pour calculer la profondeur réelle
    const result = await session.run(`
      MATCH (root:Project {uid: $projectUid})
      
      // 1. Tâches et leur profondeur
      MATCH path = (root)-[:CONTAINS*0..]->(p:Project)-[:TASK_OF]-(t:Task)
      RETURN t.uid as uid, 'TASK' as type, length(path) + 10 as sortDepth
      
      UNION
      
      // 2. Projets et leur profondeur
      MATCH path = (root)-[:CONTAINS*0..]->(p:Project)
      RETURN p.uid as uid, 'PROJECT' as type, length(path) as sortDepth
      
      ORDER BY sortDepth DESC
    `, { projectUid });
    
    return result.records.map(r => ({ uid: r.get('uid'), type: r.get('type') }));
  } finally {
    await session.close();
  }
}

 // 2. MÉTHODE DE SUPPRESSION D'UN PROJET (Unité)
  async disintegrateProject(projectUid: string, session: any, neo4jTx: any) {
    await ProjectModel.deleteOne({ uid: projectUid }, { session });
    await neo4jTx.run(`MATCH (p:Project {uid: $uid}) DETACH DELETE p`, { uid: projectUid });
  }

/**
   * 🧨 DISSOUS LE CHANTIER ET TOUTES SES TRACES (Fichiers + Atomes)
   */
  async dissolveProject(projectUid: string, signature: ActionSignature) {
    const nodesToDestroy = await this.getFullDeletionOrder(projectUid);

    return await TransactionManager.execute("Désintégration Totale", async (mongoSession, neo4jTx) => {
      
      for (const node of nodesToDestroy) {
        if (node.type === 'TASK') {
          // 1. Délégation à l'orchestrateur de tâche (qui doit aussi purger ses fichiers)
          await this.taskOrch.disintegrateTask(node.uid, signature);
        } else if (node.type === 'PROJECT') {
          // 2. PURGE PHYSIQUE : On récupère les documents avant de détruire le document Mongo
          const project = await ProjectModel.findOne({ uid: node.uid }).session(mongoSession);
          if (project && project.documents) {
            for (const doc of project.documents) {
              try {
                // Utilisation du helper pour extraire la clef technique et purger
                const key = storageService.extractKeyFromUrl(doc.url);
                await storageService.deleteFile(key);
              } catch (err) {
                console.error(`⚠️ [Orchestrator] Échec purge fichier ${doc.url} :`, err);
                // On continue la purge même si un fichier échoue
              }
            }
          }

          // 3. Suppression DB
          await ProjectModel.deleteOne({ uid: node.uid }, { session: mongoSession });
          await neo4jTx.run(`MATCH (p:Project {uid: $uid}) DETACH DELETE p`, { uid: node.uid });
        }
      }
      
      return { success: true, purgedCount: nodesToDestroy.length };
    });
  }

  // --- 📎 ATTACHEMENT : AJOUT DE FICHIERS ---

  async appendFiles(
    projectUid: string, 
    fileUrls: string[], 
    signature: ActionSignature
  ) {
    if (!signature.capabilities.includes(CAPABILITIES.PROJECT.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour injecter des données dans ce chantier.", "FORBIDDEN", 403);
    }

    const updated = await ProjectModel.findOneAndUpdate(
      { uid: projectUid }, 
      { $push: { fileUploads: { $each: fileUrls } }, $set: { "dates.lastActivity": new Date() } }, 
      { new: true }
    );
    
    if (!updated) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);
    return updated;
  }
}
// packages/shared-core/src/sync-engine/project.orchestrator.ts
import { TeamModel } from '../../../infrastructure/src/database/models/nosql/team.model';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model'; // 🪡 SUTURE : Import du modèle des Atomes pour la cascade
import { getNeo4jSession } from '../../../infrastructure/src/database/neo4j';
import { IProject } from '../../../types/src/models/project.types';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import { randomUUID } from 'crypto';
import { IlotError} from '../errors/ilot.errors';
import { v4 as uuidv4 } from 'uuid';

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

export interface ProjectSyncResult {
  success: boolean;
  status: string; // 'success' ou 'error'
  mongo: any;    // Le document MongoDB (POJO via .lean())
  neo4j: any;    // Le résultat de la transaction Neo4j
}


/**
 * 🛰️ PROJECT ORCHESTRATOR 
 * Modèle : "Zero-Identity" - L'Orchestrateur exécute selon la Signature.
 */
export class ProjectOrchestrator {

  // --- 🌟 FONDATION : CRÉATION DU CHANTIER (ANCRAGE DOUBLE) ---

  async fosterProject(
    projectData: any, 
    signature: ActionSignature // Zéro-Identité
  ): Promise<ProjectSyncResult> {
    
    // 🛡️ 1. Vérification de l'Aura via la signature
    if (!signature.capabilities.includes(CAPABILITIES.PROJECT.CREATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour sceller un chantier", "FORBIDDEN", 403);
    }

    // 🛡️ 2. PRÉPARATION DE LA MATIÈRE
    // ownerUid = Le Nid (Team) | creatorUid = L'Oiseau (User)
    const teamUid = projectData.ownerUid; 
    const actorUid = signature.actorUid;
    
    if (!teamUid) {
        throw new IlotError("Un chantier doit être ancré à un Nid (ownerUid manquant).", "BAD_REQUEST", 400);
    }

    const uid = projectData.uid || uuidv4();

    return await TransactionManager.execute("Fondation Chantier", async (mongoSession, neo4jTx) => {
      
      // 🐘 A. MONGO : La Silice (Double identité stockée)
      const finalProjectData = {
        ...projectData,
        uid,
        ownerUid: teamUid,
        creatorUid: actorUid,
        documents: projectData.documents || [], // 🪡 SUTURE : On accepte les documents dès la naissance
        slug: projectData.slug || (projectData.name ? generateSlug(projectData.name) : uid)
      };

      const [newProject] = await ProjectModel.create([finalProjectData], { session: mongoSession });

      // 🕸️ B. NEO4J : Le Système Nerveux (L'Ancrage Double)
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
        // Double ancrage bionique :
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
      
      // 🛡️ LE DOUBLE VERROU (Propriétaire du Nid ou Créateur ou Admin)
      const isCreator = project.creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');

      if (!isCreator && !isArchitect) {
        // Vérification territoriale dans le Graphe
        const check = await neo4jTx.run(`
          MATCH (u:User {uid: $actorUid})-[r:MEMBER_OF|OWNER_OF]->(t:Team)-[:HAS_PROJECT]->(p:Project {uid: $pUid})
          RETURN r.capabilities AS caps
        `, { actorUid: signature.actorUid, pUid: projectUid });

        const record = check.records[0];
        const capsFromGraph = record ? record.get('caps') : [];
        // 🪡 SUTURE : On force la conversion en tableau au cas où Neo4j renvoie un objet
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

  // --- 💀 DISSOLUTION (Delete) ---
  async dissolveProject(projectUid: string, signature: ActionSignature) {
    const project = await ProjectModel.findOne({ uid: projectUid });
    if (!project) throw new IlotError("Chantier introuvable", "NOT_FOUND", 404);

    return await TransactionManager.execute("Dissolution de Projet", async (mongoSession, neo4jTx) => {
      
      const isCreator = project.creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');

      if (!isCreator && !isArchitect) {
        throw new IlotError("Seul le Gardien de ce chantier peut le dissoudre.", "FORBIDDEN", 403);
      }

      // 🕸️ B.1 NEO4J : Suppression en cascade de tous les Atomes (Tâches) rattachés à ce Chantier
      await neo4jTx.run(`
        OPTIONAL MATCH (t:Task) WHERE t.projectUid = $projectUid
        DETACH DELETE t
      `, { projectUid });

      // Suppression du nœud Projet lui-même
      await neo4jTx.run(`MATCH (p:Project {uid: $projectUid}) DETACH DELETE p`, { projectUid });

      // 🐘 A.1 MONGO : Suppression en cascade de tous les Atomes du Chantier dans la Silice
      await TaskModel.deleteMany({ projectUid }, { session: mongoSession });

      // Suppression définitive du document Projet
      await ProjectModel.findOneAndDelete({ uid: projectUid }, { session: mongoSession });
      
      return true;
    });
  }


  // --- 📎 ATTACHEMENT : AJOUT DE FICHIERS ---

  async appendFiles(
    projectUid: string, 
    fileUrls: string[], 
    signature: ActionSignature // Zéro-Identité
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
// packages/shared-core/src/sync-engine/user.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TeamModel } from '../../../infrastructure/src/database/models/nosql/team.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { IOiseau, CAPABILITIES } from '@ilot/types';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';

export interface OiseauSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

export interface ActionSignature {
  actorUid: string;         
  capabilities: string[]; 
}

export class OiseauOrchestrator {

  /**
   * 🐣 L'ÉCLOSION (Création d'un nouvel Oiseau avec Souveraineté Totale)
   */
  async fosterOiseau(birdData: any): Promise<OiseauSyncResult> {
    const uid = uuidv4(); 
    const hashedPassword = await bcrypt.hash(birdData.password, 10);

    return await TransactionManager.execute("Éclosion d'Oiseau", async (mongoSession, neo4jTx) => {
      
      const newOiseauData = {
        uid,
        email: birdData.email,
        pseudo: birdData.pseudo,
        password: hashedPassword,
        frequenceHEX: birdData.frequenceHEX || '#8b9dc3',
        capabilities: birdData.capabilities || [ 
          CAPABILITIES.TEAM.CREATE, CAPABILITIES.TEAM.READ, CAPABILITIES.TEAM.UPDATE, CAPABILITIES.TEAM.DELETE, CAPABILITIES.TEAM.MANAGE, 
          CAPABILITIES.MEMBER.INVITE, CAPABILITIES.MEMBER.READ, CAPABILITIES.MEMBER.LIST, CAPABILITIES.MEMBER.UPDATE, CAPABILITIES.MEMBER.EXILE, 
          CAPABILITIES.PROJECT.CREATE, CAPABILITIES.PROJECT.READ, CAPABILITIES.PROJECT.UPDATE, CAPABILITIES.PROJECT.DELETE, CAPABILITIES.PROJECT.ARCHIVE, 
          CAPABILITIES.TASK.CREATE, CAPABILITIES.TASK.READ, CAPABILITIES.TASK.UPDATE, CAPABILITIES.TASK.DELETE, CAPABILITIES.TASK.MOVE,
          CAPABILITIES.FILE.UPLOAD, CAPABILITIES.FILE.READ, CAPABILITIES.FILE.UPDATE, CAPABILITIES.FILE.DOWNLOAD, CAPABILITIES.FILE.BURN
        ], 
        sanctuaireVerrouille: false,
        entropieActive: 100 
      };

      // 🛡️ Gravure des capacités dans le Graphe (Neo4j)
      const cypher = `
        MERGE (u:User {uid: $uid})
        ON CREATE SET 
            u.pseudo = $pseudo,
            u.frequenceHEX = $frequenceHEX,
            u.capabilities = $capabilities,
            u.createdAt = datetime()
        ON MATCH SET 
            u.pseudo = $pseudo,
            u.frequenceHEX = $frequenceHEX,
            u.capabilities = $capabilities,
            u.updatedAt = datetime()
        RETURN u
      `;
      
      const neoResult = await neo4jTx.run(cypher, {
        uid: newOiseauData.uid,
        pseudo: newOiseauData.pseudo,
        frequenceHEX: newOiseauData.frequenceHEX,
        capabilities: newOiseauData.capabilities
      });

      const [nouvelOiseau] = await OiseauModel.create([newOiseauData], { session: mongoSession });

      return { 
        success: true, 
        status: 'success', 
        mongo: nouvelOiseau, 
        neo4j: neoResult 
      };
    });
  }

  /**
   * 🕊️ L'ENVOL (Mise à jour de l'essence)
   */
  async syncOiseau(
    oiseauData: Partial<IOiseau> & { uid: string; capabilities?: string[] }, 
    signature: ActionSignature 
  ): Promise<OiseauSyncResult> {
    
    const isSelfEdit = signature.actorUid === oiseauData.uid;
    const hasGlobalPower = signature.capabilities.includes('*');
    
    if (!isSelfEdit && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour altérer l'essence d'un autre Oiseau.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Envol de l'Oiseau", async (mongoSession, neo4jTx) => {
      const updatePayload: any = {};
      if (oiseauData.pseudo) updatePayload.pseudo = oiseauData.pseudo;
      if (oiseauData.frequenceHEX) updatePayload.frequenceHEX = oiseauData.frequenceHEX;
      // 🛡️ Correction : on accepte le tableau vide comme mise à jour valide
      if (oiseauData.capabilities !== undefined) updatePayload.capabilities = oiseauData.capabilities;

      const updatedMongo = await OiseauModel.findOneAndUpdate(
        { uid: oiseauData.uid },
        { $set: updatePayload },
        { new: true, session: mongoSession }
      ).lean();

      if (!updatedMongo) {
        throw new IlotError("Oiseau introuvable dans la Silice", "NOT_FOUND", 404);
      }

      // 🕸️ Propagation Neo4j corrigée
      const cypher = `
        MATCH (u:User {uid: $uid})
        SET u.pseudo = coalesce($pseudo, u.pseudo), 
            u.frequenceHEX = coalesce($frequenceHEX, u.frequenceHEX),
            u.capabilities = $capabilities, 
            u.updatedAt = datetime()
        RETURN u
      `;

      const neoResult = await neo4jTx.run(cypher, {
        uid: oiseauData.uid,
        pseudo: oiseauData.pseudo || null,
        frequenceHEX: oiseauData.frequenceHEX || null,
        capabilities: updatePayload.capabilities !== undefined ? updatePayload.capabilities : null,
      });

      return { 
        success: true, 
        status: 'success', 
        mongo: updatedMongo, 
        neo4j: neoResult 
      };
    });
  }

  /**
   * 💀 L'EXIL (Désintégration Totale et Libération)
   */
  async exileOiseau(
    oiseauUid: string, 
    signature: ActionSignature 
  ): Promise<{ success: boolean; message: string }> {
    
    const isSelf = signature.actorUid === oiseauUid;
    const isRoot = signature.capabilities.includes('*');

    if (!isSelf && !isRoot) {
      throw new IlotError("Seul l'Oiseau peut fermer son Sanctuaire.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Exil de l'Oiseau", async (mongoSession, neo4jTx) => {
      
      const allTasks = await TaskModel.find({ creatorUid: oiseauUid }).session(mongoSession).lean();
      const allProjects = await ProjectModel.find({ creatorUid: oiseauUid }).session(mongoSession).lean();

      for (const task of allTasks) {
        if (task.documents) {
          for (const doc of task.documents) {
            try { await storageService.deleteFile(storageService.extractKeyFromUrl(doc.url)); } catch {}
          }
        }
      }
      for (const proj of allProjects) {
        if (proj.documents) {
          for (const doc of proj.documents) {
            try { await storageService.deleteFile(storageService.extractKeyFromUrl(doc.url)); } catch {}
          }
        }
      }

      const cypher = `
        MATCH (u:User {uid: $uid})
        OPTIONAL MATCH (u)-[:FOUNDED]->(t:Team)
        OPTIONAL MATCH (t)-[:HAS_PROJECT]->(p:Project)
        OPTIONAL MATCH (tk:Task)-[:TASK_OF]->(p)
        OPTIONAL MATCH (u)-[:CREATED]->(directTasks:Task)
        OPTIONAL MATCH (u)-[:MEMBER_OF]->(mTeam:Team)
        
        WITH u, 
             collect(DISTINCT t) + collect(DISTINCT mTeam) AS teams, 
             collect(DISTINCT p) AS projects, 
             collect(DISTINCT tk) AS tasks, 
             collect(DISTINCT directTasks) AS dTasks
        
        FOREACH (team IN teams | DETACH DELETE team)
        FOREACH (proj IN projects | DETACH DELETE proj)
        FOREACH (task IN tasks | DETACH DELETE task)
        FOREACH (dTask IN dTasks | DETACH DELETE dTask)
        
        DETACH DELETE u
        RETURN count(u) AS deletedCount
      `;
      
      await neo4jTx.run(cypher, { uid: oiseauUid });

      const userTeams = await TeamModel.find({ ownerUid: oiseauUid }).session(mongoSession).lean();
      const teamUids = userTeams.map(t => t.uid);
      const projects = await ProjectModel.find({ ownerUid: { $in: teamUids } }).session(mongoSession).lean();
      const projectUids = projects.map(p => p.uid);

      await TaskModel.deleteMany({ $or: [{ projectUid: { $in: projectUids } }, { creatorUid: oiseauUid }] }, { session: mongoSession });
      await ProjectModel.deleteMany({ ownerUid: { $in: teamUids } }, { session: mongoSession });
      await TeamModel.deleteMany({ ownerUid: oiseauUid }, { session: mongoSession });
      await OiseauModel.findOneAndDelete({ uid: oiseauUid }, { session: mongoSession }).lean();

      return { success: true, message: "Merci pour ton passage. Ton empreinte et tes traces ont été effacées." };
    });
  }

  async purgeProjectActivities(
    targetUserUid: string,
    projectUid: string,
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    const isAuthorized = signature.actorUid === targetUserUid || signature.capabilities.includes('*');
    if (!isAuthorized) throw new IlotError("Souveraineté violée.", "FORBIDDEN", 403);

    const project = await ProjectModel.findOne({ uid: projectUid });
    if (!project) throw new IlotError("Chantier introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Purge Activités Projet", async (mongoSession, neo4jTx) => {
      await neo4jTx.run(`
        MATCH (u:User {uid: $userUid})
        MATCH (p:Project {uid: $projectUid})
        OPTIONAL MATCH (tk:Task)-[:TASK_OF]->(p) WHERE tk.creatorUid = $userUid
        OPTIONAL MATCH (u)-[rAssign:ASSIGNED_TO]->(tkAll:Task)-[:TASK_OF]->(p)
        WITH collect(DISTINCT tk) AS tasksToDelete, collect(DISTINCT rAssign) AS relsToDelete
        FOREACH (task IN tasksToDelete | DETACH DELETE task)
        FOREACH (r IN relsToDelete | DELETE r)
      `, { userUid: targetUserUid, projectUid });

      await TaskModel.deleteMany({ projectUid, creatorUid: targetUserUid }, { session: mongoSession });
      await TaskModel.updateMany({ projectUid, assigneeUids: targetUserUid }, { $pull: { assigneeUids: targetUserUid } }, { session: mongoSession });

      return { success: true, message: "Purge effectuée." };
    });
  }

  async appliquerFluctuation(
    oiseauUid: string,
    entropie: number,
    signature: ActionSignature,
    frequenceHEX?: string
  ): Promise<OiseauSyncResult> {
    
    const isSelf = signature.actorUid === oiseauUid;
    if (!isSelf && !signature.capabilities.includes('*')) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    return await TransactionManager.execute("Fluctuation d'Oiseau", async (mongoSession, neo4jTx) => {
      const updateData: any = { entropieActive: entropie };
      if (frequenceHEX) updateData.frequenceHEX = frequenceHEX;

      const updatedMongo = await OiseauModel.findOneAndUpdate({ uid: oiseauUid }, { $set: updateData }, { new: true, session: mongoSession }).lean();
      if (!updatedMongo) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

      if (frequenceHEX) {
        await neo4jTx.run(`MATCH (u:User {uid: $uid}) SET u.frequenceHEX = $hex, u.updatedAt = datetime()`, { uid: oiseauUid, hex: frequenceHEX });
      }

      return { success: true, status: 'success', mongo: updatedMongo, neo4j: null };
    });
  }
}
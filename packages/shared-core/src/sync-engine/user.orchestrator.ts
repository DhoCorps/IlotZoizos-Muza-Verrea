import { OiseauModel, TeamModel, ProjectModel, TaskModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { IOiseau, CAPABILITIES } from '@ilot/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { resolveCanonicalUid } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

interface IStorageManager {
  deleteFile(key: string): Promise<unknown>;
  extractKeyFromUrl(url: string): string;
}

export interface OiseauSyncResult {
  success: boolean;
  status: string;
  mongo: unknown;
  neo4j: QueryResult | null;
  [key: string]: unknown;
}

export interface ActionSignature {
  actorUid: string;            
  capabilities: string[]; 
}

export interface FosterOiseauPayload {
  email: string;
  password: string;
  pseudo: string;
  frequenceHEX?: string;
  capabilities?: string[];
  [key: string]: unknown;
}

interface IDocumentStorage {
  documents?: Array<{ url?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface ITeamUidEntity {
  uid: string;
  [key: string]: unknown;
}

interface IProjectUidEntity {
  uid: string;
  [key: string]: unknown;
}

export class OiseauOrchestrator {
  private storageService: IStorageManager;

  constructor(customStorageService?: IStorageManager) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }

  /**
   * 🐣 L'ÉCLOSION (Création d'un nouvel Oiseau avec Souveraineté Totale)
   */
  public async fosterOiseau(birdData: FosterOiseauPayload): Promise<OiseauSyncResult> {
    const uid = uuidv4(); 
    const hashedPassword = await bcrypt.hash(birdData.password, 10);

    return await TransactionManager.execute("Éclosion d'Oiseau", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      
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
        entropieActive: 100,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      const [nouvelOiseau] = await OiseauModel.create([newOiseauData], { session: mongoSession });

      const cypher = `
        CREATE (u:User {
            uid: $uid,
            pseudo: $pseudo,
            frequenceHEX: $frequenceHEX,
            capabilities: $capabilities,
            createdAt: datetime($now),
            updatedAt: datetime($now)
        })
        RETURN u
      `;
      
      const neoResult = (await neo4jTx.run(cypher, {
        uid: newOiseauData.uid,
        pseudo: newOiseauData.pseudo,
        frequenceHEX: newOiseauData.frequenceHEX,
        capabilities: newOiseauData.capabilities,
        now: now.toISOString()
      })) as QueryResult;

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
  public async syncOiseau(
    oiseauData: Partial<IOiseau> & { uid: string; capabilities?: string[] }, 
    signature: ActionSignature 
  ): Promise<OiseauSyncResult> {
    
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, oiseauData.uid, "Oiseau cible");

    const isSelfEdit = actorCanonicalUid === targetCanonicalUid;
    const hasGlobalPower = signature.capabilities.includes('*');
    
    if (!isSelfEdit && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour altérer l'essence d'un autre Oiseau.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Envol de l'Oiseau", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();

      const updatePayload: Record<string, unknown> = {};
      if (oiseauData.pseudo) updatePayload.pseudo = oiseauData.pseudo;
      if (oiseauData.frequenceHEX) updatePayload.frequenceHEX = oiseauData.frequenceHEX;
      
      if (oiseauData.capabilities !== undefined) {
        if (!hasGlobalPower) {
          throw new IlotError("Tentative d'élévation de privilèges détectée.", "FORBIDDEN", 403);
        }
        updatePayload.capabilities = oiseauData.capabilities;
      }

      updatePayload['dates.updatedAt'] = now;

      const updatedMongo = await OiseauModel.findOneAndUpdate(
        { uid: targetCanonicalUid },
        { $set: updatePayload },
        { new: true, session: mongoSession }
      ).lean();

      if (!updatedMongo) {
        throw new IlotError("Oiseau introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const cypher = `
        MATCH (u:User {uid: $canonicalUid})
        SET u.pseudo = coalesce($pseudo, u.pseudo), 
            u.frequenceHEX = coalesce($frequenceHEX, u.frequenceHEX),
            u.capabilities = coalesce($capabilities, u.capabilities), 
            u.updatedAt = datetime($now)
        RETURN u
      `;

      const neoResult = (await neo4jTx.run(cypher, {
        canonicalUid: targetCanonicalUid,
        pseudo: oiseauData.pseudo || null,
        frequenceHEX: oiseauData.frequenceHEX || null,
        capabilities: updatePayload.capabilities !== undefined ? (updatePayload.capabilities as string[]) : null,
        now: now.toISOString()
      })) as QueryResult;

      return { 
        success: true, 
        status: 'success', 
        mongo: updatedMongo, 
        neo4j: neoResult 
      };
    });
  }

  /**
   * 💀 L'EXIL (Désintégration Totale et Libération - Phase 4 : Curseurs Mongoose anti Memory Spikes)
   */
  public async exileOiseau(
    oiseauIdentifier: string, 
    signature: ActionSignature 
  ): Promise<{ success: boolean; message: string }> {
    
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, oiseauIdentifier, "Oiseau cible");
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    const isSelf = actorCanonicalUid === targetCanonicalUid;
    const isRoot = signature.capabilities.includes('*');

    if (!isSelf && !isRoot) {
      throw new IlotError("Seul l'Oiseau peut fermer son Sanctuaire.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Exil de l'Oiseau", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      
      const batchSize = 50;
      let filesBatch: string[] = [];

      const processBatch = async (files: string[]) => {
        if (files.length === 0) return;
        await Promise.all(
          files.map(async (key) => {
            try {
              await this.storageService.deleteFile(key);
            } catch (error: unknown) {
              const errMessage = error instanceof Error ? error.message : String(error);
              console.error(`  [Orchestrator] Échec purge fichier ${key} :`, errMessage);
            }
          })
        );
      };

      // 1. Purge S3/R2 incrémentielle par lots via curseur Mongoose pour les Tâches
      const taskCursor = TaskModel.find({ creatorUid: targetCanonicalUid }).select('documents').session(mongoSession).cursor();
      for await (const task of taskCursor) {
        const taskDoc = task as unknown as IDocumentStorage;
        if (taskDoc.documents && Array.isArray(taskDoc.documents)) {
          for (const doc of taskDoc.documents) {
            if (doc && doc.url) {
              filesBatch.push(this.storageService.extractKeyFromUrl(doc.url));
              if (filesBatch.length >= batchSize) {
                await processBatch(filesBatch);
                filesBatch = [];
              }
            }
          }
        }
      }

      // 2. Purge S3/R2 incrémentielle par lots via curseur Mongoose pour les Projets
      const projCursor = ProjectModel.find({ creatorUid: targetCanonicalUid }).select('documents').session(mongoSession).cursor();
      for await (const proj of projCursor) {
        const projDoc = proj as unknown as IDocumentStorage;
        if (projDoc.documents && Array.isArray(projDoc.documents)) {
          for (const doc of projDoc.documents) {
            if (doc && doc.url) {
              filesBatch.push(this.storageService.extractKeyFromUrl(doc.url));
              if (filesBatch.length >= batchSize) {
                await processBatch(filesBatch);
                filesBatch = [];
              }
            }
          }
        }
      }

      if (filesBatch.length > 0) {
        await processBatch(filesBatch);
      }

      // Nettoyage relationnel massif via l'index strict sur le canonicalUid
      const cypher = `
        MATCH (u:User {uid: $canonicalUid})
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
      
      await neo4jTx.run(cypher, { canonicalUid: targetCanonicalUid });

      const userTeams = (await TeamModel.find({ ownerUid: targetCanonicalUid }).session(mongoSession).lean()) as unknown as ITeamUidEntity[];
      const teamUids = userTeams.map(t => t.uid);
      const projects = (await ProjectModel.find({ ownerUid: { $in: teamUids } }).session(mongoSession).lean()) as unknown as IProjectUidEntity[];
      const projectUids = projects.map(p => p.uid);

      await TaskModel.deleteMany({ $or: [{ projectUid: { $in: projectUids } }, { creatorUid: targetCanonicalUid }] }, { session: mongoSession });
      await ProjectModel.deleteMany({ ownerUid: { $in: teamUids } }, { session: mongoSession });
      await TeamModel.deleteMany({ ownerUid: targetCanonicalUid }, { session: mongoSession });
      await OiseauModel.findOneAndDelete({ uid: targetCanonicalUid }, { session: mongoSession }).lean();

      return { success: true, message: "Merci pour ton passage. Ton empreinte et tes traces ont été effacées." };
    });
  }

  public async purgeProjectActivities(
    targetUserIdentifier: string,
    projectUid: string,
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, targetUserIdentifier, "Oiseau cible");
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    const isAuthorized = actorCanonicalUid === targetCanonicalUid || signature.capabilities.includes('*');
    if (!isAuthorized) throw new IlotError("Souveraineté violée.", "FORBIDDEN", 403);

    const project = await ProjectModel.findOne({ uid: projectUid });
    if (!project) throw new IlotError("Chantier introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Purge Activités Projet", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      await neo4jTx.run(`
        MATCH (u:User {uid: $userUid})
        MATCH (p:Project {uid: $projectUid})
        OPTIONAL MATCH (tk:Task)-[:TASK_OF]->(p) WHERE tk.creatorUid = $userUid
        OPTIONAL MATCH (u)-[rAssign:ASSIGNED_TO]->(tkAll:Task)-[:TASK_OF]->(p)
        WITH collect(DISTINCT tk) AS tasksToDelete, collect(DISTINCT rAssign) AS relsToDelete
        FOREACH (task IN tasksToDelete | DETACH DELETE task)
        FOREACH (r IN relsToDelete | DELETE r)
      `, { userUid: targetCanonicalUid, projectUid });

      await TaskModel.deleteMany({ projectUid, creatorUid: targetCanonicalUid }, { session: mongoSession });
      await TaskModel.updateMany({ projectUid, assigneeUids: targetCanonicalUid }, { $pull: { assigneeUids: targetCanonicalUid } }, { session: mongoSession });

      return { success: true, message: "Purge effectuée." };
    });
  }

  public async appliquerFluctuation(
    oiseauIdentifier: string,
    entropie: number,
    signature: ActionSignature,
    frequenceHEX?: string
  ): Promise<OiseauSyncResult> {
    
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, oiseauIdentifier, "Oiseau cible");
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    const isSelf = actorCanonicalUid === targetCanonicalUid;
    if (!isSelf && !signature.capabilities.includes('*')) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    return await TransactionManager.execute("Fluctuation d'Oiseau", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();

      const updateData: Record<string, unknown> = { entropieActive: entropie };
      if (frequenceHEX) updateData.frequenceHEX = frequenceHEX;
      updateData['dates.updatedAt'] = now;

      const updatedMongo = await OiseauModel.findOneAndUpdate({ uid: targetCanonicalUid }, { $set: updateData }, { new: true }).lean();
      if (!updatedMongo) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

      const neoResult = (await neo4jTx.run(`MATCH (u:User {uid: $uid}) SET u.frequenceHEX = coalesce($hex, u.frequenceHEX), u.updatedAt = datetime($now) RETURN u`, { 
        uid: targetCanonicalUid, 
        hex: frequenceHEX || null,
        now: now.toISOString() 
      })) as QueryResult;

      return { success: true, status: 'success', mongo: updatedMongo, neo4j: neoResult };
    });
  }
}
import { OiseauModel, TeamModel, ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { IOiseau, CAPABILITIES } from '@ilot/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Interface d'injection pour isoler le shared-core du service de stockage externe de l'application
interface IStorageManager {
  deleteFile(key: string): Promise<any>;
  extractKeyFromUrl(url: string): string;
}

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
  private storageService: IStorageManager;

  constructor(customStorageService?: IStorageManager) {
    // Par défaut (pour les tests), on injecte un mock silencieux
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }

  // 🛡️ Résolution canonique interne via l'utilitaire global unifié
  private async resolveCanonicalUserUid(identifier: string): Promise<string> {
    const user = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!user) throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    return (user as any).uid;
  }

  /**
   * 🐣 L'ÉCLOSION (Création d'un nouvel Oiseau avec Souveraineté Totale)
   */
  async fosterOiseau(birdData: Record<string, any>): Promise<OiseauSyncResult> {
    const uid = uuidv4(); 
    const hashedPassword = await bcrypt.hash(birdData.password, 10);

    return await TransactionManager.execute("Éclosion d'Oiseau", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
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

      // 1. Persistance Documentaire (Silice)
      const [nouvelOiseau] = await OiseauModel.create([newOiseauData], { session: mongoSession });

      // 2. Propagation Neo4j par ID strict avec la date synchronisée
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
      
      const neoResult = await neo4jTx.run(cypher, {
        uid: newOiseauData.uid,
        pseudo: newOiseauData.pseudo,
        frequenceHEX: newOiseauData.frequenceHEX,
        capabilities: newOiseauData.capabilities,
        now: now.toISOString()
      });

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
    
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);
    const targetCanonicalUid = await this.resolveCanonicalUserUid(oiseauData.uid);

    const isSelfEdit = actorCanonicalUid === targetCanonicalUid;
    const hasGlobalPower = signature.capabilities.includes('*');
    
    if (!isSelfEdit && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour altérer l'essence d'un autre Oiseau.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Envol de l'Oiseau", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const updatePayload: Record<string, any> = {};
      if (oiseauData.pseudo) updatePayload.pseudo = oiseauData.pseudo;
      if (oiseauData.frequenceHEX) updatePayload.frequenceHEX = oiseauData.frequenceHEX;
      
      // 🛡️ CORRECTION CYBERSÉCURITÉ : Prévention d'élévation de privilèges
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

      // MATCH indexé strict sur l'UID canonique avec la date unifiée
      const cypher = `
        MATCH (u:User {uid: $canonicalUid})
        SET u.pseudo = coalesce($pseudo, u.pseudo), 
            u.frequenceHEX = coalesce($frequenceHEX, u.frequenceHEX),
            u.capabilities = coalesce($capabilities, u.capabilities), 
            u.updatedAt = datetime($now)
        RETURN u
      `;

      const neoResult = await neo4jTx.run(cypher, {
        canonicalUid: targetCanonicalUid,
        pseudo: oiseauData.pseudo || null,
        frequenceHEX: oiseauData.frequenceHEX || null,
        capabilities: updatePayload.capabilities !== undefined ? updatePayload.capabilities : null,
        now: now.toISOString()
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
    oiseauIdentifier: string, 
    signature: ActionSignature 
  ): Promise<{ success: boolean; message: string }> {
    
    const targetCanonicalUid = await this.resolveCanonicalUserUid(oiseauIdentifier);
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);

    const isSelf = actorCanonicalUid === targetCanonicalUid;
    const isRoot = signature.capabilities.includes('*');

    if (!isSelf && !isRoot) {
      throw new IlotError("Seul l'Oiseau peut fermer son Sanctuaire.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("L'Exil de l'Oiseau", async (mongoSession, neo4jTx) => {
      
      const allTasks = await TaskModel.find({ creatorUid: targetCanonicalUid }).session(mongoSession).lean();
      const allProjects = await ProjectModel.find({ creatorUid: targetCanonicalUid }).session(mongoSession).lean();

      // 1. Rassemblement de toutes les clés de fichiers à incinérer
      const filesToDelete: string[] = [];
      [...allTasks, ...allProjects].forEach((entity: any) => {
        if (entity.documents && Array.isArray(entity.documents)) {
          entity.documents.forEach((doc: any) => {
            if (doc.url) {
              filesToDelete.push(this.storageService.extractKeyFromUrl(doc.url));
            }
          });
        }
      });

      // 2. Parallélisation massive de la purge physique S3/R2
      await Promise.all(
        filesToDelete.map(async (key) => {
          try {
            await this.storageService.deleteFile(key);
          } catch (err) {
            console.error(`  [Orchestrator] Échec purge fichier ${key} :`, err);
          }
        })
      );

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

      const userTeams = await TeamModel.find({ ownerUid: targetCanonicalUid }).session(mongoSession).lean();
      const teamUids = userTeams.map(t => t.uid);
      const projects = await ProjectModel.find({ ownerUid: { $in: teamUids } }).session(mongoSession).lean();
      const projectUids = projects.map(p => p.uid);

      await TaskModel.deleteMany({ $or: [{ projectUid: { $in: projectUids } }, { creatorUid: targetCanonicalUid }] }, { session: mongoSession });
      await ProjectModel.deleteMany({ ownerUid: { $in: teamUids } }, { session: mongoSession });
      await TeamModel.deleteMany({ ownerUid: targetCanonicalUid }, { session: mongoSession });
      await OiseauModel.findOneAndDelete({ uid: targetCanonicalUid }, { session: mongoSession }).lean();

      return { success: true, message: "Merci pour ton passage. Ton empreinte et tes traces ont été effacées." };
    });
  }

  async purgeProjectActivities(
    targetUserIdentifier: string,
    projectUid: string,
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    const targetCanonicalUid = await this.resolveCanonicalUserUid(targetUserIdentifier);
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);

    const isAuthorized = actorCanonicalUid === targetCanonicalUid || signature.capabilities.includes('*');
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
      `, { userUid: targetCanonicalUid, projectUid });

      await TaskModel.deleteMany({ projectUid, creatorUid: targetCanonicalUid }, { session: mongoSession });
      await TaskModel.updateMany({ projectUid, assigneeUids: targetCanonicalUid }, { $pull: { assigneeUids: targetCanonicalUid } }, { session: mongoSession });

      return { success: true, message: "Purge effectuée." };
    });
  }

  async appliquerFluctuation(
    oiseauIdentifier: string,
    entropie: number,
    signature: ActionSignature,
    frequenceHEX?: string
  ): Promise<OiseauSyncResult> {
    
    const targetCanonicalUid = await this.resolveCanonicalUserUid(oiseauIdentifier);
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);

    const isSelf = actorCanonicalUid === targetCanonicalUid;
    if (!isSelf && !signature.capabilities.includes('*')) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    return await TransactionManager.execute("Fluctuation d'Oiseau", async (_mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const updateData: Record<string, any> = { entropieActive: entropie };
      if (frequenceHEX) updateData.frequenceHEX = frequenceHEX;
      updateData['dates.updatedAt'] = now;

      const updatedMongo = await OiseauModel.findOneAndUpdate({ uid: targetCanonicalUid }, { $set: updateData }, { new: true }).lean();
      if (!updatedMongo) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

      await neo4jTx.run(`MATCH (u:User {uid: $uid}) SET u.frequenceHEX = coalesce($hex, u.frequenceHEX), u.updatedAt = datetime($now)`, { 
        uid: targetCanonicalUid, 
        hex: frequenceHEX || null,
        now: now.toISOString() 
      });

      return { success: true, status: 'success', mongo: updatedMongo, neo4j: null };
    });
  }
}
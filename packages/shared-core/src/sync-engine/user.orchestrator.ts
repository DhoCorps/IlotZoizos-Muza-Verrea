// packages/shared-core/src/sync-engine/user.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TeamModel } from '../../../infrastructure/src/database/models/nosql/team.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model'; // 🪡 SUTURE : Alignement de la Silice pour les Chantiers
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';       // 🪡 SUTURE : Alignement de la Silice pour les Atomes
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { IOiseau, CAPABILITIES } from '@ilot/types';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

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
   * 🐣 L'ÉCLOSION (Création d'un nouvel Oiseau)
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
        
        // 🌟 SUTURE AUTOMATIQUE : Dotation complète des plumes à la naissance
        capabilities: birdData.capabilities || [ 
          // 🏰 Administration du Nid
          CAPABILITIES.TEAM.CREATE, 
          CAPABILITIES.TEAM.READ, 
          CAPABILITIES.TEAM.UPDATE, 
          CAPABILITIES.TEAM.DELETE, 
          CAPABILITIES.TEAM.MANAGE, 
          
          // 🕊️ Gestion de la Volée (Plus de 403 au recrutement !)
          CAPABILITIES.MEMBER.INVITE, 
          CAPABILITIES.MEMBER.READ, 
          CAPABILITIES.MEMBER.LIST, 
          CAPABILITIES.MEMBER.UPDATE, 
          CAPABILITIES.MEMBER.EXILE, 
          
          // 🏗️ Fragments (Projets)
          CAPABILITIES.PROJECT.CREATE, 
          CAPABILITIES.PROJECT.READ, 
          CAPABILITIES.PROJECT.UPDATE, 
          CAPABILITIES.PROJECT.DELETE, 
          CAPABILITIES.PROJECT.ARCHIVE, 
          
          // ⚛️ Tâches Opérationnelles (Atomes)
          CAPABILITIES.TASK.CREATE, 
          CAPABILITIES.TASK.READ, 
          CAPABILITIES.TASK.UPDATE, 
          CAPABILITIES.TASK.DELETE, 
          CAPABILITIES.TASK.MOVE,

          // 🕯️ Archives & Le Cierge (Fichiers)
          CAPABILITIES.FILE.UPLOAD,
          CAPABILITIES.FILE.READ,
          CAPABILITIES.FILE.UPDATE,
          CAPABILITIES.FILE.DOWNLOAD,
          CAPABILITIES.FILE.BURN
        ], 
        sanctuaireVerrouille: false,
        entropieActive: 100 
      };

      const cypher = `
        CREATE (u:User {
          uid: $uid,
          pseudo: $pseudo,
          frequenceHEX: $frequenceHEX,
          capabilities: $capabilities,
          createdAt: datetime()
        })
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
   * Synchronise les modifications de l'Oiseau entre la Silice et le Graphe.
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
      const updatedMongo = await OiseauModel.findOneAndUpdate(
        { uid: oiseauData.uid },
        { 
          $set: { 
            ...(oiseauData.pseudo && { pseudo: oiseauData.pseudo }),
            ...(oiseauData.frequenceHEX && { frequenceHEX: oiseauData.frequenceHEX }),
            ...(oiseauData.capabilities && { capabilities: oiseauData.capabilities }) 
          } 
        },
        { new: true, session: mongoSession }
      ).lean();

      if (!updatedMongo) {
        throw new IlotError("Oiseau introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const cypher = `
        MATCH (u:User {uid: $uid})
        SET u.pseudo = coalesce($pseudo, u.pseudo), 
            u.frequenceHEX = coalesce($frequenceHEX, u.frequenceHEX),
            u.capabilities = coalesce($capabilities, u.capabilities),
            u.updatedAt = datetime()
        RETURN u
      `;

      const neoResult = await neo4jTx.run(cypher, {
        uid: oiseauData.uid,
        pseudo: oiseauData.pseudo || null,
        frequenceHEX: oiseauData.frequenceHEX || null,
        capabilities: oiseauData.capabilities || null, 
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
      // 🕸️ 1. DÉSINTÉGRATION EN CASCADE PURIFIÉE (Neo4j)
      const cypher = `
        MATCH (u:User {uid: $uid})
        
        // Alignement sémantique : On remplace OWNER_OF par FOUNDED et on redresse l'axe des tâches
        OPTIONAL MATCH (u)-[:FOUNDED]->(t:Team)
        OPTIONAL MATCH (t)-[:HAS_PROJECT]->(p:Project)
        OPTIONAL MATCH (tk:Task)-[:TASK_OF]->(p)
        OPTIONAL MATCH (u)-[:CREATED]->(directTasks:Task)
        
        // Élimination du crash multi-lignes : On isole et fusionne les entités distinctes
        WITH u, 
             collect(DISTINCT t) AS teams, 
             collect(DISTINCT p) AS projects, 
             collect(DISTINCT tk) AS tasks, 
             collect(DISTINCT directTasks) AS dTasks
        
        // Dissolution par boucles isolées de sécurité
        FOREACH (team IN teams | DETACH DELETE team)
        FOREACH (proj IN projects | DETACH DELETE proj)
        FOREACH (task IN tasks | DETACH DELETE task)
        FOREACH (dTask IN dTasks | DETACH DELETE dTask)
        
        // Libération finale de l'empreinte de l'Oiseau
        DETACH DELETE u
        RETURN 1 AS countFound
      `;
      
      const result = await neo4jTx.run(cypher, { uid: oiseauUid });
      const countFound = result.records.length > 0 ? result.records[0].get('countFound').toNumber() : 0;

      if (countFound === 0) {
        console.warn(`⚠️ [Neo4j] L'oiseau ${oiseauUid} n'était pas présent dans le Graphe.`);
      }

      // 🐘 2. NETTOYAGE DE LA SILICE (MongoDB) - Cascade de purification synchronisée
      const userTeams = await TeamModel.find({ ownerUid: oiseauUid }).session(mongoSession).lean();
      const teamUids = userTeams.map(t => t.uid);

      const projects = await ProjectModel.find({ ownerUid: { $in: teamUids } }).session(mongoSession).lean();
      const projectUids = projects.map(p => p.uid);

      // Suppression de tous les Atomes (Tâches) rattachés à ses chantiers ou créés directement par lui
      await TaskModel.deleteMany(
        { $or: [{ projectUid: { $in: projectUids } }, { creatorUid: oiseauUid }] },
        { session: mongoSession }
      );

      // Suppression de tous les Chantiers (Projets) rattachés aux nids qu'il possédait
      await ProjectModel.deleteMany({ ownerUid: { $in: teamUids } }, { session: mongoSession });

      // Suppression des Nids (Équipes) possédés
      await TeamModel.deleteMany({ ownerUid: oiseauUid }, { session: mongoSession });

      // Extraction finale de l'empreinte de l'Oiseau de la Silice
      const deletedMongo = await OiseauModel.findOneAndDelete(
        { uid: oiseauUid },
        { session: mongoSession }
      ).lean();

      if (!deletedMongo) {
        throw new IlotError("L'onde est déjà dissipée dans la Silice.", "NOT_FOUND", 404);
      }

      return { 
        success: true,
        message: "Merci pour ton passage. Ton empreinte a été effacée de l'Îlot."
      };
    });
  }

  /**
   * 🌪️ FLUCTUATION (Entropie)
   */
  async appliquerFluctuation(
    oiseauUid: string,
    entropie: number,
    signature: ActionSignature,
    frequenceHEX?: string
  ): Promise<OiseauSyncResult> {
    
    const isSelf = signature.actorUid === oiseauUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fluctuation d'Oiseau", async (mongoSession, neo4jTx) => {
      const updateData: any = { entropieActive: entropie };
      if (frequenceHEX) updateData.frequenceHEX = frequenceHEX;

      const updatedMongo = await OiseauModel.findOneAndUpdate(
        { oiseauUid },
        { $set: updateData },
        { new: true, session: mongoSession }
      ).lean();

      if (!updatedMongo) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

      if (frequenceHEX) {
        await neo4jTx.run(
          `MATCH (u:User {uid: $uid}) SET u.frequenceHEX = $hex, u.updatedAt = datetime()`,
          { uid: oiseauUid, hex: frequenceHEX }
        );
      }

      return { success: true, status: 'success', mongo: updatedMongo, neo4j: null };
    });
  }
}
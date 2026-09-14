import { OiseauModel, UniversalMediaModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface UniversalMediaSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

/**
 * UNIVERSAL MEDIA ORCHESTRATOR
 * Gère la sédimentation d'un Asset dans la Silice et son tissage dans le Graphe.
 * Phase 2 : Utilisation d'un index strict sur le créateur canonique dans Neo4j.
 */
export class UniversalMediaOrchestrator {
  
  /**
   * Utilitaire interne pour résoudre strictement l'UID canonique via la Silice (MongoDB)
   * Permet d'éradiquer les "FULL GRAPH SCANS" dans Neo4j.
   */
  private async resolveCanonicalUid(identifier: string): Promise<string> {
    const user = await OiseauModel.findOne({
      $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }]
    }).lean();
    
    if (!user) {
      throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return (user as any).uid;
  }

  /**
   * FONDATION : FORGER UN ASSET UNIVERSEL
   */
  async fosterMedia(data: any, signature: ActionSignature): Promise<UniversalMediaSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour forger un Asset.", "UNAUTHORIZED", 401);
    }

    // Résolution stricte de l'UID (Phase 2)
    const actorCanonicalUid = await this.resolveCanonicalUid(signature.actorUid);

    return await TransactionManager.execute("Fondation d'Asset Universel", async (mongoSession, neo4jTx) => {
      const mediaId = data.mediaId || `media_${randomUUID()}`;

      const newMediaData = {
        ...data,
        mediaId,
        creatorUid: actorCanonicalUid,
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newMedia] = await UniversalMediaModel.create([newMediaData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j)
      // On ne stocke que le squelette relationnel pour des requêtes rapides
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (m:UniversalMedia { 
           mediaId: $mediaId, 
           type: $type, 
           sourceApp: $sourceApp, 
           createdAt: datetime() 
        })
        CREATE (u)-[:CREATED]->(m)
        RETURN m
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        mediaId: newMedia.mediaId,
        type: newMedia.type,
        sourceApp: newMedia.sourceApp
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Oiseau créateur introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newMedia,
        neo4j: neoResult
      };
    });
  }

  /**
   * DÉSINTÉGRATION : PURGER UN ASSET
   * Note : La suppression physique du fichier (S3) sera gérée en amont par la Route API.
   */
  async disintegrateMedia(mediaIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const existing = await UniversalMediaModel.findOne({ mediaId: mediaIdentifier });
    if (!existing) throw new IlotError("Asset introuvable.", "NOT_FOUND", 404);

    const isCreator = existing.creatorUid === signature.actorUid;
    if (!isCreator && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul le créateur ou l'Architecte peut désintégrer cet Asset.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration d'Asset", async (mongoSession, neo4jTx) => {
      // 1. Purge du Graphe
      await neo4jTx.run(`MATCH (m:UniversalMedia { mediaId: $mediaId }) DETACH DELETE m`, { mediaId: existing.mediaId });
      
      // 2. Purge de la Silice
      await UniversalMediaModel.deleteOne({ mediaId: existing.mediaId }, { session: mongoSession });
      
      return { success: true, purgedCount: 1 };
    });
  }
}
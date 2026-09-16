import { UniversalMediaModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface UniversalMediaSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: import('neo4j-driver').QueryResult;
}

/**
 * UNIVERSAL MEDIA ORCHESTRATOR
 * Gère la sédimentation d'un Asset dans la Silice et son tissage dans le Graphe.
 * Utilise directement l'identifiant de l'acteur.
 */
export class UniversalMediaOrchestrator {
  
  /**
   * FONDATION : FORGER UN ASSET UNIVERSEL
   */
  async fosterMedia(data: Record<string, unknown>, signature: ActionSignature): Promise<UniversalMediaSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour forger un Asset.", "UNAUTHORIZED", 401);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Fondation d'Asset Universel", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const mediaId = (data.mediaId as string) || `media_${randomUUID()}`;

      const newMediaData = {
        ...data,
        mediaId,
        creatorUid: actorCanonicalUid,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newMedia] = await UniversalMediaModel.create([newMediaData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) avec l'horodatage synchronisé
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (m:UniversalMedia { 
           mediaId: $mediaId, 
           type: $type, 
           sourceApp: $sourceApp, 
           createdAt: datetime($now) 
        })
        CREATE (u)-[:CREATED]->(m)
        RETURN m
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        mediaId: newMedia.mediaId,
        type: newMedia.type,
        sourceApp: newMedia.sourceApp,
        now: now.toISOString()
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
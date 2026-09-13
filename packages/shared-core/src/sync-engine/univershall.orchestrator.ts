// packages/shared-core/src/sync-engine/univershall.orchestrator.ts

import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface UniversHallSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

const generateSlug = (text: string) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * UNIVERS'HALL ORCHESTRATOR
 * Gère l'agora centrale : sédimentation des balises (beacons) reliant Poetrik, Bibliothek,
 * Partita et les autres modules, et leur tissage relationnel dans le Graphe Neo4j.
 */
export class UniversHallOrchestrator {
  /**
   * FONDATION : PLANTER UNE BALISE SUR L'AGORA
   */
  async plantBeacon(data: {
    uid?: string;
    sourceModule: 'POETRIK' | 'BIBLIOTEK' | 'PARTITA' | 'LETRIN' | 'SAMPLOTEK' | 'ABYSS';
    entityUid: string;
    title: string;
    slug?: string;
    summary?: string;
    tags?: string[];
    resonanceScore?: number;
    metadata?: Record<string, any>;
  }, signature: ActionSignature): Promise<UniversHallSyncResult> {

    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour planter une balise sur l'Agora.", "UNAUTHORIZED", 401);
    }

    if (!data.title || !data.entityUid || !data.sourceModule) {
      throw new IlotError("Une balise sur l'Agora nécessite un titre, un module source et un identifiant d'entité.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Plantation de Balise Univers'Hall", async (mongoSession, neo4jTx) => {
      const beaconUid = data.uid || `beacon_${randomUUID()}`;
      
      // Sécurisation de l'unicité du slug
      let baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(data.title);
      let finalSlug = baseSlug;
      let slugExists = await UniversHallBeaconModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await UniversHallBeaconModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      const beaconData = {
        uid: beaconUid,
        sourceModule: data.sourceModule,
        entityUid: data.entityUid,
        title: data.title,
        slug: finalSlug,
        authorUid: signature.actorUid,
        authorSlug: signature.actorUid, // Peut être affiné si le profil possède un slug
        summary: data.summary || '',
        tags: data.tags || [],
        resonanceScore: data.resonanceScore || 0,
        metadata: data.metadata || {}
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newBeacon] = await UniversHallBeaconModel.create([beaconData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) en reliant l'Auteur à la Balise et au Module
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (b:AgoraBeacon {
          uid: $beaconUid,
          sourceModule: $sourceModule,
          title: $title,
          slug: $slug,
          resonanceScore: $resonanceScore,
          createdAt: datetime()
        })
        CREATE (u)-[:PLANTED_BEACON]->(b)
        RETURN b
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        beaconUid: newBeacon.uid,
        sourceModule: newBeacon.sourceModule,
        title: newBeacon.title,
        slug: newBeacon.slug,
        resonanceScore: newBeacon.resonanceScore
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage de la balise dans la Matrice Neo4j.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newBeacon,
        neo4j: neoResult
      };
    });
  }

  /**
   * DISSOLUTION : RETIRER UNE BALISE DE L'AGORA
   */
  async dissolveBeacon(beaconIdentifier: string, signature: ActionSignature) {
    const existing = await UniversHallBeaconModel.findOne({ 
      $or: [{ uid: beaconIdentifier }, { slug: beaconIdentifier }] 
    });

    if (!existing) {
      throw new IlotError("Balise introuvable sur l'Agora.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut retirer cette balise.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Dissolution de Balise Univers'Hall", async (mongoSession, neo4jTx) => {
      // 1. Suppression relationnelle dans le Graphe
      await neo4jTx.run(`MATCH (b:AgoraBeacon { uid: $beaconUid }) DETACH DELETE b`, { 
        beaconUid: existing.uid 
      });

      // 2. Suppression documentaire dans la Silice
      await UniversHallBeaconModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });
  }
}
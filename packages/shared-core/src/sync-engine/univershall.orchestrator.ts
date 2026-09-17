import { UniversHallBeaconModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID, randomBytes } from 'crypto';
import { generateSlug } from '../utils/string.engine';

export interface UniversHallSyncResult {
  success: boolean;
  status: string;
  mongo: import('mongoose').Document & Record<string, any>;
  neo4j: import('neo4j-driver').QueryResult;
  purgedCount?: number;
}

/**
 * UNIVERS'HALL ORCHESTRATOR
 * Gère l'agora centrale : sédimentation des balises (beacons) reliant Poetrik, Bibliothek,
 * Partita et les autres modules, et leur tissage relationnel dans le Graphe Neo4j.
 * Intègre une unicité atomique anti-concurrence pour les slugs.
 */
export class UniversHallOrchestrator {

  /**
   * Utilitaire interne pour garantir l'unicité atomique du slug sans boucle séquentielle bloquante (Race Conditions E11000).
   */
  private async ensureUniqueSlug(Model: any, baseSlug: string, session: any): Promise<string> {
    let finalSlug = baseSlug;
    let exists = await Model.findOne({ slug: finalSlug }).session(session).lean();
    
    if (exists) {
      const randomSuffix = randomBytes(2).toString('hex');
      finalSlug = `${baseSlug}-${randomSuffix}`;
    }
    return finalSlug;
  }

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
    metadata?: Record<string, unknown>;
  }, signature: ActionSignature): Promise<UniversHallSyncResult> {

    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour planter une balise sur l'Agora.", "UNAUTHORIZED", 401);
    }

    if (!data.title || !data.entityUid || !data.sourceModule) {
      throw new IlotError("Une balise sur l'Agora nécessite un titre, un module source et un identifiant d'entité.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Plantation de Balise Univers'Hall", async (mongoSession, neo4jTx) => {
      const now = new Date();
      const beaconUid = data.uid || `beacon_${randomUUID()}`;
      
      // Sécurisation atomique de l'unicité du slug
      let baseSlug = generateSlug(data.slug || data.title);
      let finalSlug = await this.ensureUniqueSlug(UniversHallBeaconModel, baseSlug, mongoSession);

      const beaconData = {
        uid: beaconUid,
        sourceModule: data.sourceModule,
        entityUid: data.entityUid,
        title: data.title,
        slug: finalSlug,
        authorUid: signature.actorUid,
        authorSlug: signature.actorUid,
        summary: data.summary || '',
        tags: data.tags || [],
        resonanceScore: data.resonanceScore || 0,
        metadata: data.metadata || {},
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB) avec gestion gracieuse de secours E11000
      let newBeacon;
      try {
        const created = await UniversHallBeaconModel.create([beaconData], { session: mongoSession });
        newBeacon = created[0];
      } catch (err: any) {
        if (err.code === 11000) {
          throw new IlotError("Collision critique de slug sur la balise. Veuillez réitérer.", "CONFLICT", 409);
        }
        throw err;
      }

      // 2. Tissage dans le Graphe (Neo4j)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (b:AgoraBeacon {
           uid: $beaconUid,
           sourceModule: $sourceModule,
           title: $title,
           slug: $slug,
           resonanceScore: $resonanceScore,
           createdAt: datetime($now),
           updatedAt: datetime($now)
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
        resonanceScore: newBeacon.resonanceScore,
        now: now.toISOString()
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
  async dissolveBeacon(beaconIdentifier: string, signature: ActionSignature): Promise<UniversHallSyncResult> {
    const existing = await findEntityBySlugOrUid(UniversHallBeaconModel, beaconIdentifier) as any;

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

      return { 
        success: true, 
        status: 'success', 
        purgedCount: 1,
        mongo: existing,
        neo4j: {} as any
      };
    });
  }
}
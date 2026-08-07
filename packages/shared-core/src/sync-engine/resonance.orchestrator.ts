// packages/shared-core/src/sync-engine/resonance.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { getNeo4jSession } from '@ilot/infrastructure';
import { ActionSignature, CAPABILITIES, EntityLabel, ResonanceType } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';


export interface IResonancePayload {
  sourceUid: string;
  targetUid: string;
  type: ResonanceType;
  entityId?: string;
}

export class ResonanceOrchestrator {
  
  /**
   * 🕸️ LE TISSERAND TRANSDISCIPLINAIRE
   * Crée un pont direct entre deux modules distincts (ex: Blog -> Shop) avec support polymorphe (uid/slug).
   */
  public static async weaveCrossDomainLink(
    sourceUid: string,
    sourceLabel: EntityLabel,
    targetUid: string,
    targetLabel: EntityLabel,
    relationType: ResonanceType,
    signature: ActionSignature
  ) {
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL)) {
      throw new IlotError("Aura insuffisante pour tisser le maillage global.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Tissage Transdisciplinaire", async (mongoSession, neo4jTx) => {
      
      const cypher = `
        MATCH (source:${sourceLabel}) WHERE source.uid = $sourceUid OR source.slug = $sourceUid
        MATCH (target:${targetLabel}) WHERE target.uid = $targetUid OR target.slug = $targetUid
        MERGE (source)-[r:${relationType}]->(target)
        ON CREATE SET r.createdAt = datetime(), r.actorUid = $actorUid
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, {
        sourceUid,
        targetUid,
        actorUid: signature.actorUid
      });

      if (neoResult.records.length === 0) {
         throw new IlotError("L'un des deux nœuds est introuvable dans le Graphe.", "NOT_FOUND", 404);
      }
      
      return { success: true, neo4j: neoResult };
    });
  }

  /**
   * 💬 L'ÉCHO SOCIAL (Commentaires & Emojis)
   * Permet à un Oiseau de réagir à n'importe quelle entité de l'Îlot (support uid ou slug).
   */
  public static async addSocialEcho(
    targetUid: string,
    targetLabel: EntityLabel,
    echoType: 'TEXT' | 'EMOJI',
    content: string,
    signature: ActionSignature
  ) {
    if (!signature.actorUid) throw new IlotError("Oiseau fantôme.", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Sédimentation d'Écho", async (mongoSession, neo4jTx) => {
      
      const echoUid = `echo_${randomUUID()}`;
      const relation = echoType === 'TEXT' ? 'ECHOES' : 'VIBRATES';

      const cypher = `
        MATCH (u:User) WHERE u.uid = $actorUid OR u.slug = $actorUid
        MATCH (target:${targetLabel}) WHERE target.uid = $targetUid OR target.slug = $targetUid
        
        CREATE (u)-[r:${relation} { 
          uid: $echoUid,
          content: $content,
          createdAt: datetime() 
        }]->(target)
        
        RETURN r
      `;

      const res = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        targetUid,
        echoUid,
        content
      });

      if (res.records.length === 0) {
        throw new IlotError("Cible ou acteur introuvable pour l'écho.", "NOT_FOUND", 404);
      }
      
      return { success: true, echoUid, content, type: echoType };
    });
  }

  /**
   * 🔍 LE RADAR DE RÉSONANCE (Lecture seule)
   * Va chercher toutes les entités connectées à un nœud spécifique (par uid ou slug).
   */
  public static async getResonances(identifier: string) {
    const session = getNeo4jSession();
    try {
      const cypher = `
        MATCH (center) WHERE center.uid = $identifier OR center.slug = $identifier
        MATCH (center)-[r]-(neighbor)
        RETURN 
          type(r) AS relationType, 
          labels(neighbor)[0] AS neighborType, 
          neighbor.uid AS neighborUid, 
          neighbor.title AS neighborTitle, 
          neighbor.name AS neighborName
      `;
      
      const result = await session.run(cypher, { identifier });
      
      return result.records.map(rec => ({
        relation: rec.get('relationType'),
        type: rec.get('neighborType'),
        uid: rec.get('neighborUid'),
        title: rec.get('neighborTitle') || rec.get('neighborName') || 'Entité inconnue'
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Recherche les résonances transversales entre un oiseau et le reste de la volière
   */
  public static async findTransversalResonances(userIdentifier: string): Promise<{ peerUid: string; sharedTags: string[]; score: number }[]> {
    return await TransactionManager.execute('findTransversalResonances', async (mongoSession, neo4jTx) => {
        const query = `
            MATCH (target:User) WHERE target.uid = $userIdentifier OR target.slug = $userIdentifier
            MATCH (target)-[:PARTAGE]->(tag:Tag)<-[:PARTAGE]-(peer:User)
            WHERE target <> peer
            RETURN peer.uid AS peerUid, collect(tag.name) AS sharedTags, count(tag) AS commonCount
            ORDER BY commonCount DESC
            LIMIT 10
        `;

        const result = await neo4jTx.run(query, { userIdentifier });
        
        return result.records.map((record: any) => ({
            peerUid: record.get('peerUid'),
            sharedTags: record.get('sharedTags'),
            score: record.get('commonCount').toNumber() * 2 
        }));
    });
  }

  /**
   * 🕸️ TISSER LA RÉSONANCE (Abonnements Granulaires)
   * Crée un lien d'abonnement et évalue la naissance d'une Harmonie (suivi mutuel).
   */
  public static async weaveResonance(payload: IResonancePayload): Promise<boolean> {
    return await TransactionManager.execute("Tissage de Résonance", async (mongoSession, neo4jTx) => {
      const { sourceUid, targetUid, type, entityId } = payload;

      // 1. Tisser le lien spécifique (GLOBAL, SPECIFIC, ou ECLIPSE)
      await neo4jTx.run(
        `MATCH (source:User) WHERE source.uid = $sourceUid OR source.slug = $sourceUid
         MATCH (target:User) WHERE target.uid = $targetUid OR target.slug = $targetUid
         MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         ON CREATE SET r.createdAt = datetime()
         ON MATCH SET r.updatedAt = datetime()`,
        { sourceUid, targetUid, type, entityId: entityId || 'ALL' }
      );

      // 2. Vérification de l'Harmonie (Si c'est un abonnement GLOBAL mutuel)
      let isHarmonic = false;
      if (type === 'FOLLOWS_GLOBAL') {
        const harmonyCheck = await neo4jTx.run(
          `MATCH (a:User) WHERE a.uid = $sourceUid OR a.slug = $sourceUid
           MATCH (b:User) WHERE b.uid = $targetUid OR b.slug = $targetUid
           MATCH (a)-[r1:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(b)
           MATCH (b)-[r2:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(a)
           MERGE (a)-[h:HARMONY]-(b)
           ON CREATE SET h.establishedAt = datetime()
           RETURN h`,
          { sourceUid, targetUid }
        );
        isHarmonic = harmonyCheck.records.length > 0;
      }

      return isHarmonic;
    });
  }

  /**
   * ✂️ COUPER LE FIL (Désabonnement)
   * Détruit la résonance et brise l'Harmonie si elle existait.
   */
  public static async severResonance(payload: IResonancePayload): Promise<void> {
    await TransactionManager.execute("Coupure de Résonance", async (mongoSession, neo4jTx) => {
      const { sourceUid, targetUid, type, entityId } = payload;

      await neo4jTx.run(
        `MATCH (source:User) WHERE source.uid = $sourceUid OR source.slug = $sourceUid
         MATCH (target:User) WHERE target.uid = $targetUid OR target.slug = $targetUid
         MATCH (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         DELETE r
         
         WITH source, target
         OPTIONAL MATCH (source)-[h:HARMONY]-(target)
         DELETE h`,
        { sourceUid, targetUid, type, entityId: entityId || 'ALL' }
      );
    });
  }
}
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
   * Crée un pont direct entre deux modules distincts (ex: Blog -> Shop)
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
        MATCH (source:${sourceLabel} { uid: $sourceUid })
        MATCH (target:${targetLabel} { uid: $targetUid })
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
   * Permet à un Oiseau de réagir à n'importe quelle entité de l'Îlot
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
        MATCH (u:User { uid: $actorUid })
        MATCH (target:${targetLabel} { uid: $targetUid })
        
        CREATE (u)-[r:${relation} { 
          uid: $echoUid,
          content: $content,
          createdAt: datetime() 
        }]->(target)
        
        RETURN r
      `;

      await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        targetUid,
        echoUid,
        content
      });
      
      return { success: true, echoUid, content, type: echoType };
    });
  }

  /**
   * 🔍 LE RADAR DE RÉSONANCE
   * Va chercher toutes les entités connectées à un nœud spécifique
   */
  public static async getResonances(uid: string) {
    const session = getNeo4jSession();
    try {
      const cypher = `
        MATCH (center { uid: $uid })-[r]-(neighbor)
        RETURN 
          type(r) AS relationType, 
          labels(neighbor)[0] AS neighborType, 
          neighbor.uid AS neighborUid, 
          neighbor.title AS neighborTitle, 
          neighbor.name AS neighborName
      `;
      
      const result = await session.run(cypher, { uid });
      
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
  public static async findTransversalResonances(userUid: string): Promise<{ peerUid: string; sharedTags: string[]; score: number }[]> {
    return await TransactionManager.execute('findTransversalResonances', async (mongoSession, neo4jTx) => {
        const query = `
            MATCH (target:User {uid: $userUid})-[:PARTAGE]->(tag:Tag)<-[:PARTAGE]-(peer:User)
            WHERE target <> peer
            RETURN peer.uid AS peerUid, collect(tag.name) AS sharedTags, count(tag) AS commonCount
            ORDER BY commonCount DESC
            LIMIT 10
        `;

        const result = await neo4jTx.run(query, { userUid });
        
        return result.records.map(record => ({
            peerUid: record.get('peerUid'),
            sharedTags: record.get('sharedTags'),
            score: record.get('commonCount').toNumber() * 2 
        }));
    });
  }

  /**
   * 🕸️ NOUVEAU : TISSER LA RÉSONANCE (Abonnements Granulaires)
   * Crée un lien d'abonnement et évalue la naissance d'une Harmonie (suivi mutuel).
   */
  public static async weaveResonance(payload: IResonancePayload): Promise<boolean> {
    const session = getNeo4jSession();
    try {
      const { sourceUid, targetUid, type, entityId } = payload;

      // 1. Tisser le lien spécifique (GLOBAL, SPECIFIC, ou ECLIPSE)
      await session.run(
        `MATCH (source:User {uid: $sourceUid}), (target:User {uid: $targetUid})
         MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         ON CREATE SET r.createdAt = datetime()
         ON MATCH SET r.updatedAt = datetime()`,
        { sourceUid, targetUid, type, entityId: entityId || 'ALL' }
      );

      // 2. Vérification de l'Harmonie (Si c'est un abonnement GLOBAL mutuel)
      let isHarmonic = false;
      if (type === 'FOLLOWS_GLOBAL') {
        const harmonyCheck = await session.run(
          `MATCH (a:User {uid: $sourceUid})-[r1:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(b:User {uid: $targetUid})
           MATCH (b)-[r2:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(a)
           MERGE (a)-[h:HARMONY]-(b)
           ON CREATE SET h.establishedAt = datetime()
           RETURN h`
        );
        isHarmonic = harmonyCheck.records.length > 0;
      }

      return isHarmonic;
    } catch (error) {
      console.error("🌋 [NEO4J WEAVE FORGE ERROR] :", error);
      throw new IlotError("Conflit dimensionnel lors du tissage.", "INTERNAL_ERROR", 500);
    } finally {
      await session.close();
    }
  }

  /**
   * ✂️ NOUVEAU : COUPER LE FIL (Désabonnement)
   * Détruit la résonance et brise l'Harmonie si elle existait.
   */
  public static async severResonance(payload: IResonancePayload): Promise<void> {
    const session = getNeo4jSession();
    try {
      const { sourceUid, targetUid, type, entityId } = payload;

      await session.run(
        `MATCH (source:User {uid: $sourceUid})-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target:User {uid: $targetUid})
         DELETE r
         
         // Rupture conditionnelle de l'Harmonie si on coupe un lien GLOBAL
         WITH source, target
         OPTIONAL MATCH (source)-[h:HARMONY]-(target)
         DELETE h`,
        { sourceUid, targetUid, type, entityId: entityId || 'ALL' }
      );
    } catch (error) {
      console.error("🌋 [NEO4J SEVER ERROR] :", error);
      throw new IlotError("Impossible de briser le lien.", "INTERNAL_ERROR", 500);
    } finally {
      await session.close();
    }
  }
}
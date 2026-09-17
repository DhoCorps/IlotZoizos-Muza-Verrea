import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, CAPABILITIES, EntityLabel, ResonanceType } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { resolveCanonicalUid, safeSyncUniversalInteraction } from '../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult, Record as Neo4jRecord } from 'neo4j-driver';

export interface IResonancePayload {
  sourceUid: string;
  targetUid: string;
  type: ResonanceType;
  entityId?: string;
  [key: string]: unknown;
}

export interface ResonanceSyncResult {
  success: boolean;
  echoUid?: string;
  content?: string;
  type?: string;
  neo4j?: QueryResult;
}

export class ResonanceOrchestrator {

  /**
   * 🕸️ LE TISSERAND TRANSDISCIPLINAIRE (Mise à jour KaÔdZ)
   */
  public static async weaveCrossDomainLink(
    sourceUid: string,
    sourceLabel: string, 
    targetUid: string,
    targetLabel: string,
    relationType: string,
    signature: ActionSignature
  ): Promise<{ success: boolean; neo4j: QueryResult }> {
    const ALLOWED_LABELS = ['User', 'Project', 'Task', 'Partita', 'Letter', 'Sample', 'Sujet', 'Store', 'Team', 'AgoraBeacon'];
    const ALLOWED_RELATIONS = ['RELATES_TO', 'ILLUMINATES', 'DETAILS', 'FOLLOWS_GLOBAL', 'ECHOES', 'VIBRATES', 'COMPOSED', 'WROTE'];

    if (!ALLOWED_LABELS.includes(sourceLabel) || !ALLOWED_LABELS.includes(targetLabel)) {
       throw new IlotError("Tentative d'injection de label Neo4j détectée.", "BAD_REQUEST", 400);
    }
    if (!ALLOWED_RELATIONS.includes(relationType)) {
       throw new IlotError("Tentative d'injection de relation Neo4j détectée.", "BAD_REQUEST", 400);
    }
    
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    return await TransactionManager.execute("Tissage Transdisciplinaire", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      const isRoot = signature.capabilities.includes('*') || signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL);

      const cypher = `
        MATCH (source:${sourceLabel} {uid: $sourceUid})
        MATCH (target:${targetLabel} {uid: $targetUid})
        
        ${!isRoot ? `
          OPTIONAL MATCH (u:User {uid: $actorUid})-[r:CREATED|COMPOSED|WROTE|OWNS_STORE|FOUNDED]->(source)
          WITH source, target, u, r
          WHERE r IS NOT NULL
        ` : 'WITH source, target'}

        MERGE (source)-[rel:${relationType}]->(target)
        ON CREATE SET rel.createdAt = datetime($now), rel.actorUid = $actorUid
        RETURN rel
      `;

      const neoResult = await neo4jTx.run(cypher, {
        sourceUid,
        targetUid,
        actorUid: actorCanonicalUid,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) { 
         throw new IlotError("Échec du tissage : Entités introuvable ou Aura insuffisante pour lier cette source.", "FORBIDDEN", 403);
      }
            
      return { success: true, neo4j: neoResult };
    });
  }

  /**
   * 🗣️ ÉCHO SOCIAL (Commentaires & Emojis)
   */
  public static async addSocialEcho(
    targetUid: string,
    targetLabel: EntityLabel,
    echoType: 'TEXT' | 'EMOJI',
    content: string,
    signature: ActionSignature
  ): Promise<ResonanceSyncResult> {
    if (!signature.actorUid) throw new IlotError("Oiseau fantôme.", "UNAUTHORIZED", 401);
    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    const result = await TransactionManager.execute("Sédimentation d'Écho", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = Date.now();    
      const echoUid = `echo_${randomUUID()}`;
      const relation = echoType === 'TEXT' ? 'ECHOES' : 'VIBRATES';

      const cypher = `
        MATCH (u:User {uid: $actorUid})
        MATCH (target:${targetLabel} {uid: $targetUid})
        CREATE (u)-[r:${relation} { 
           uid: $echoUid,
          content: $content,
          createdAt: datetime($now) 
         }]->(target)
        WITH r, target
        OPTIONAL MATCH (target)<-[:CREATED|COMPOSED|WROTE|OWNS_STORE|FOUNDED|TASK_OF]-(owner:User)
        RETURN r, coalesce(owner.uid, CASE WHEN '${targetLabel}' = 'User' THEN target.uid ELSE null END) AS ownerUid LIMIT 1
      `;

      const res = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        targetUid,
        echoUid,
        content,
        now: new Date(now).toISOString()
      });

      if (res.records.length === 0) {
        throw new IlotError("Cible ou acteur introuvable pour l'écho dans la Matrice.", "NOT_FOUND", 404);
      }

      const ownerUid = res.records[0].get('ownerUid') as string | null;
            
      return { success: true, echoUid, content, type: echoType, ownerUid };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA L'UTILITAIRE GLOBAL
    if (result.ownerUid && result.ownerUid !== actorCanonicalUid) {
      await safeSyncUniversalInteraction(actorCanonicalUid, result.ownerUid, 'PRAISE', 'addSocialEcho');
    }

    return { success: result.success, echoUid: result.echoUid, content: result.content, type: result.type };
  }

  /**
   * 📡 LE RADAR DE RÉSONANCE (Lecture seule)
   */
  public static async getResonances(canonicalUid: string): Promise<Array<{ relation: unknown; type: unknown; uid: unknown; title: unknown }>> {
    const session = getNeo4jSession();
    try {
      const cypher = `
        MATCH (center {uid: $canonicalUid})-[r]-(neighbor)
        RETURN 
           type(r) AS relationType,
           labels(neighbor)[0] AS neighborType,
           neighbor.uid AS neighborUid,
           neighbor.title AS neighborTitle,
           neighbor.name AS neighborName
      `;
            
      const result = await session.run(cypher, { canonicalUid });
            
      return result.records.map((rec: Neo4jRecord) => ({
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
   * 🌌 Recherche les résonances transversales entre un oiseau et le reste de la volière
   */
  public static async findTransversalResonances(userIdentifier: string): Promise<{ peerUid: string; sharedTags: string[]; score: number }[]> {
    const canonicalUid = await resolveCanonicalUid(OiseauModel, userIdentifier, "Oiseau");
    return await TransactionManager.execute('findTransversalResonances', async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
        const query = `
            MATCH (target:User {uid: $canonicalUid})
            MATCH (target)-[:PARTAGE]->(tag:Tag)<-[:PARTAGE]-(peer:User)
            WHERE target <> peer
            RETURN peer.uid AS peerUid, collect(tag.name) AS sharedTags, count(tag) AS commonCount
            ORDER BY commonCount DESC
            LIMIT 10
        `;
        const result = await neo4jTx.run(query, { canonicalUid });
            
        return result.records.map((record: Neo4jRecord) => {
            const countNum = record.get('commonCount') as { toNumber?: () => number } | number;
            const numericValue = typeof countNum === 'object' && countNum !== null && 'toNumber' in countNum && typeof countNum.toNumber === 'function' 
                ? countNum.toNumber() 
                : Number(countNum);

            return {
                peerUid: record.get('peerUid') as string,
                sharedTags: record.get('sharedTags') as string[],
                score: numericValue * 2 
            };
        });
    });
  }

  /**
   * 🤝 TISSER LA RÉSONANCE (Abonnements Granulaires & Harmonie)
   */
  public static async weaveResonance(payload: IResonancePayload): Promise<boolean> {
    const sourceCanonicalUid = await resolveCanonicalUid(OiseauModel, payload.sourceUid, "Oiseau source");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, payload.targetUid, "Oiseau cible");

    const isHarmonic = await TransactionManager.execute("Tissage de Résonance", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      const { type, entityId } = payload;
      
      await neo4jTx.run(
        `MATCH (source:User {uid: $sourceUid})
         MATCH (target:User {uid: $targetUid})
         MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         ON CREATE SET r.createdAt = datetime($now)
         ON MATCH SET r.updatedAt = datetime($now)`,
        { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid, type, entityId: entityId || 'ALL', now: now.toISOString() }
      );

      let harmonicStatus = false;
      if (type === 'FOLLOWS_GLOBAL') {
        const harmonyCheck = await neo4jTx.run(
          `MATCH (a:User {uid: $sourceUid})
           MATCH (b:User {uid: $targetUid})
           MATCH (a)-[r1:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(b)
           MATCH (b)-[r2:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(a)
           MERGE (a)-[h:HARMONY]-(b)
           ON CREATE SET h.establishedAt = datetime($now)
           RETURN h`,
          { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid, now: now.toISOString() }
        );
        harmonicStatus = harmonyCheck.records.length > 0;
      }
      return harmonicStatus;
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA L'UTILITAIRE GLOBAL
    if (sourceCanonicalUid !== targetCanonicalUid) {
      await safeSyncUniversalInteraction(sourceCanonicalUid, targetCanonicalUid, 'PRAISE', 'weaveResonance');
    }

    return isHarmonic;
  }

  /**
   * ✂️ COUPER LE FIL (Désabonnement)
   */
  public static async severResonance(payload: IResonancePayload): Promise<void> {
    const sourceCanonicalUid = await resolveCanonicalUid(OiseauModel, payload.sourceUid, "Oiseau source");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, payload.targetUid, "Oiseau cible");

    await TransactionManager.execute("Coupure de Résonance", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const { type, entityId } = payload;
      await neo4jTx.run(
        `MATCH (source:User {uid: $sourceUid})
         MATCH (target:User {uid: $targetUid})
         MATCH (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         DELETE r
                
         WITH source, target
         OPTIONAL MATCH (source)-[h:HARMONY]-(target)
         DELETE h`,
        { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid, type, entityId: entityId || 'ALL' }
      );
    });
  }
}
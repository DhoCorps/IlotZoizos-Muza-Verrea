// packages/shared-core/src/sync-engine/resonance.orchestrator.ts
import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { getNeo4jSession } from '@ilot/infrastructure';
import { ActionSignature, CAPABILITIES, EntityLabel, ResonanceType } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { syncUniversalInteraction } from '@ilot/infrastructure';

export interface IResonancePayload {
  sourceUid: string;
  targetUid: string;
  type: ResonanceType;
  entityId?: string;
}

export class ResonanceOrchestrator {
  /**
   * 🔍 Utilitaire interne pour résoudre l'UID canonique d'un Oiseau depuis la Silice.
   * Prévient l'utilisation de clauses OR et de Full Graph Scans dans Neo4j.
   */
  private static async resolveCanonicalUserUid(identifier: string): Promise<string> {
    const user = await OiseauModel.findOne({ 
        $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }] 
      }).lean();
          
    if (!user) {
      throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return (user as any).uid;
  }

  /**
   * 🕸️ LE TISSERAND TRANSDISCIPLINAIRE (Mise à jour KaÔdZ)
   */
  public static async weaveCrossDomainLink(
    sourceUid: string,
    sourceLabel: EntityLabel,
    targetUid: string,
    targetLabel: EntityLabel,
    relationType: ResonanceType,
    signature: ActionSignature
  ) {
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);

    return await TransactionManager.execute("Tissage Transdisciplinaire", async (mongoSession, neo4jTx) => {
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
        ON CREATE SET rel.createdAt = datetime(), rel.actorUid = $actorUid
        RETURN rel
      `;

      const neoResult = await neo4jTx.run(cypher, {
        sourceUid,
        targetUid,
        actorCanonicalUid
      });

      if (neoResult.records.length === 0) { 
         throw new IlotError("Échec du tissage : Entités introuvables ou Aura insuffisante pour lier cette source.", "FORBIDDEN", 403);
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
  ) {
    if (!signature.actorUid) throw new IlotError("Oiseau fantôme.", "UNAUTHORIZED", 401);
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);

    const result = await TransactionManager.execute("Sédimentation d'Écho", async (mongoSession, neo4jTx) => {
              
      const echoUid = `echo_${randomUUID()}`;
      const relation = echoType === 'TEXT' ? 'ECHOES' : 'VIBRATES';

      // On récupère l'UID du créateur de l'entité ciblée pour le Karma
      const cypher = `
        MATCH (u:User {uid: $actorUid})
        MATCH (target:${targetLabel} {uid: $targetUid})
        CREATE (u)-[r:${relation} { 
           uid: $echoUid,
          content: $content,
          createdAt: datetime() 
         }]->(target)
        WITH r, target
        OPTIONAL MATCH (target)<-[:CREATED|COMPOSED|WROTE|OWNS_STORE|FOUNDED|TASK_OF]-(owner:User)
        RETURN r, coalesce(owner.uid, CASE WHEN '${targetLabel}' = 'User' THEN target.uid ELSE null END) AS ownerUid LIMIT 1
      `;

      const res = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        targetUid,
        echoUid,
        content
      });

      if (res.records.length === 0) {
        throw new IlotError("Cible ou acteur introuvable pour l'écho dans la Matrice.", "NOT_FOUND", 404);
      }

      const ownerUid = res.records[0].get('ownerUid');
              
      return { success: true, echoUid, content, type: echoType, ownerUid };
    });

    // 🕸️ Tissage universel : L'acteur interagit avec le propriétaire de l'entité
    if (result.ownerUid && result.ownerUid !== actorCanonicalUid) {
      syncUniversalInteraction(actorCanonicalUid, result.ownerUid, 'PRAISE').catch(console.error);
    }

    return { success: result.success, echoUid: result.echoUid, content: result.content, type: result.type };
  }

  /**
   * 📡 LE RADAR DE RÉSONANCE (Lecture seule)
   */
  public static async getResonances(canonicalUid: string) {
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
   * 🌌 Recherche les résonances transversales entre un oiseau et le reste de la volière
   */
  public static async findTransversalResonances(userIdentifier: string): Promise<{ peerUid: string; sharedTags: string[]; score: number }[]> {
    const canonicalUid = await this.resolveCanonicalUserUid(userIdentifier);
    return await TransactionManager.execute('findTransversalResonances', async (mongoSession, neo4jTx) => {
        const query = `
            MATCH (target:User {uid: $canonicalUid})
            MATCH (target)-[:PARTAGE]->(tag:Tag)<-[:PARTAGE]-(peer:User)
            WHERE target <> peer
            RETURN peer.uid AS peerUid, collect(tag.name) AS sharedTags, count(tag) AS commonCount
            ORDER BY commonCount DESC
            LIMIT 10
        `;
        const result = await neo4jTx.run(query, { canonicalUid });
                  
        return result.records.map((record: any) => ({
            peerUid: record.get('peerUid'),
            sharedTags: record.get('sharedTags'),
            score: record.get('commonCount').toNumber() * 2 
         }));
    });
  }

  /**
   * 🤝 TISSER LA RÉSONANCE (Abonnements Granulaires & Harmonie)
   */
  public static async weaveResonance(payload: IResonancePayload): Promise<boolean> {
    const sourceCanonicalUid = await this.resolveCanonicalUserUid(payload.sourceUid);
    const targetCanonicalUid = await this.resolveCanonicalUserUid(payload.targetUid);

    const isHarmonic = await TransactionManager.execute("Tissage de Résonance", async (mongoSession, neo4jTx) => {
      const { type, entityId } = payload;
      
      await neo4jTx.run(
        `MATCH (source:User {uid: $sourceUid})
         MATCH (target:User {uid: $targetUid})
         MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         ON CREATE SET r.createdAt = datetime()
         ON MATCH SET r.updatedAt = datetime()`,
        { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid, type, entityId: entityId || 'ALL' }
      );

      let harmonicStatus = false;
      if (type === 'FOLLOWS_GLOBAL') {
        const harmonyCheck = await neo4jTx.run(
          `MATCH (a:User {uid: $sourceUid})
           MATCH (b:User {uid: $targetUid})
           MATCH (a)-[r1:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(b)
           MATCH (b)-[r2:RESONATES_WITH {type: 'FOLLOWS_GLOBAL'}]->(a)
           MERGE (a)-[h:HARMONY]-(b)
           ON CREATE SET h.establishedAt = datetime()
           RETURN h`,
          { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid }
        );
        harmonicStatus = harmonyCheck.records.length > 0;
      }
      return harmonicStatus;
    });

    // 🕸️ Tissage universel en arrière-plan
    if (sourceCanonicalUid !== targetCanonicalUid) {
      syncUniversalInteraction(sourceCanonicalUid, targetCanonicalUid, 'PRAISE').catch(console.error);
    }

    return isHarmonic;
  }

  /**
   * ✂️ COUPER LE FIL (Désabonnement)
   */
  public static async severResonance(payload: IResonancePayload): Promise<void> {
    const sourceCanonicalUid = await this.resolveCanonicalUserUid(payload.sourceUid);
    const targetCanonicalUid = await this.resolveCanonicalUserUid(payload.targetUid);

    await TransactionManager.execute("Coupure de Résonance", async (mongoSession, neo4jTx) => {
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
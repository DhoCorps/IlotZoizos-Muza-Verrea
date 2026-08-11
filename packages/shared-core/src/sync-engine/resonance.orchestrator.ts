// packages/shared-core/src/sync-engine/resonance.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
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
   * 🛡️ Utilitaire interne pour résoudre l'UID canonique d'un Oiseau depuis la Silice.
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
   * 🕸️ LE TISSERAND TRANSDISCIPLINAIRE
   * Crée un pont direct entre deux modules distincts (ex: Blog -> Shop) avec support polymorphe.
   * NOTE : sourceUid et targetUid doivent être les UID stricts (canoniques) résolus en amont.
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
      
      // Utilisation stricte des index Neo4j via {uid: $Uid} (Phase 2)
      const cypher = `
        MATCH (source:${sourceLabel} {uid: $sourceUid})
        MATCH (target:${targetLabel} {uid: $targetUid})
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

    return await TransactionManager.execute("Sédimentation d'Écho", async (mongoSession, neo4jTx) => {
      
      const echoUid = `echo_${randomUUID()}`;
      const relation = echoType === 'TEXT' ? 'ECHOES' : 'VIBRATES';

      const cypher = `
        MATCH (u:User {uid: $actorUid})
        MATCH (target:${targetLabel} {uid: $targetUid})
        CREATE (u)-[r:${relation} { 
          uid: $echoUid,
          content: $content,
          createdAt: datetime() 
        }]->(target)
        RETURN r
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
      
      return { success: true, echoUid, content, type: echoType };
    });
  }

  /**
   * 🔍 LE RADAR DE RÉSONANCE (Lecture seule)
   * Note : Le paramètre `canonicalUid` DOIT être l'identifiant strict pour exploiter l'index global Neo4j.
   */
  public static async getResonances(canonicalUid: string) {
    const session = getNeo4jSession();
    try {
      // Éradication du Full Node Scan en utilisant l'index sur {uid: $canonicalUid}
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
   * 🤝 Recherche les résonances transversales entre un oiseau et le reste de la volière
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
   * 🕸️ TISSER LA RÉSONANCE (Abonnements Granulaires & Harmonie)
   */
  public static async weaveResonance(payload: IResonancePayload): Promise<boolean> {
    const sourceCanonicalUid = await this.resolveCanonicalUserUid(payload.sourceUid);
    const targetCanonicalUid = await this.resolveCanonicalUserUid(payload.targetUid);

    return await TransactionManager.execute("Tissage de Résonance", async (mongoSession, neo4jTx) => {
      const { type, entityId } = payload;

      // 1. Tisser le lien spécifique (MATCH strict)
      await neo4jTx.run(
        `MATCH (source:User {uid: $sourceUid})
         MATCH (target:User {uid: $targetUid})
         MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)
         ON CREATE SET r.createdAt = datetime()
         ON MATCH SET r.updatedAt = datetime()`,
        { sourceUid: sourceCanonicalUid, targetUid: targetCanonicalUid, type, entityId: entityId || 'ALL' }
      );

      // 2. Vérification de l'Harmonie (Si c'est un abonnement GLOBAL mutuel)
      let isHarmonic = false;
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
        isHarmonic = harmonyCheck.records.length > 0;
      }

      return isHarmonic;
    });
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
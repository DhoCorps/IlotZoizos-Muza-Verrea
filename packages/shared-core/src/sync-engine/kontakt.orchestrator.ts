import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure'; // 👈 Import de la DLQ

export class KontaktOrchestrator {

  /**
   * Utilitaire interne pour résoudre strictement l'UID canonique via l'utilitaire global
   * Permet d'éradiquer les "FULL GRAPH SCANS" dans Neo4j.
   */
  private async resolveCanonicalUid(identifier: string): Promise<string> {
    const user = await findEntityBySlugOrUid(OiseauModel, identifier);
    
    if (!user) {
      throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return (user as any).uid;
  }

  /**
   * 💘 GESTION D'UN SWIPE / MATCH (Le Tinder Pro & JDR)
   * Enregistre l'interaction et crée un lien de résonance dans le Graphe si c'est un Match.
   */
  async registerSwipe(
    data: { swiperUid: string; targetUid: string; action: 'LIKE' | 'PASS' },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour effectuer un swipe.", "UNAUTHORIZED", 401);
    }

    const swiperCanonicalUid = await this.resolveCanonicalUid(data.swiperUid);
    const targetCanonicalUid = await this.resolveCanonicalUid(data.targetUid);

    const result = await TransactionManager.execute("Enregistrement de Swipe Kontakt", async (mongoSession, neo4jTx) => {
      const now = new Date();
      let isMatch = false;

      if (data.action === 'LIKE') {
        const checkQuery = `
          MATCH (target:User {uid: $targetUid})
          MATCH (swiper:User {uid: $swiperUid})
          MATCH (target)-[r:SWIPED { action: 'LIKE' }]->(swiper)
          RETURN r
        `;
        const checkResult = await neo4jTx.run(checkQuery, {
          swiperUid: swiperCanonicalUid,
          targetUid: targetCanonicalUid
        });

        isMatch = checkResult.records.length > 0;

        const swipeQuery = `
          MATCH (u1:User {uid: $swiperUid})
          MATCH (u2:User {uid: $targetUid})
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime($now) }]->(u2)
          ${isMatch ? 'CREATE (u1)-[:MATCHED_WITH { createdAt: datetime($now) }]->(u2) CREATE (u2)-[:MATCHED_WITH { createdAt: datetime($now) }]->(u1)' : ''}
          RETURN $isMatch AS match
        `;

        await neo4jTx.run(swipeQuery, {
          swiperUid: swiperCanonicalUid,
          targetUid: targetCanonicalUid,
          action: data.action,
          isMatch,
          now: now.toISOString()
        });
      } else if (data.action === 'PASS') {
        const passQuery = `
          MATCH (u1:User {uid: $swiperUid})
          MATCH (u2:User {uid: $targetUid})
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime($now) }]->(u2)
          RETURN s
        `;
        await neo4jTx.run(passQuery, {
          swiperUid: swiperCanonicalUid,
          targetUid: targetCanonicalUid,
          action: data.action,
          now: now.toISOString()
        });
      }

      return { success: true, action: data.action, match: isMatch };
    });

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL : Fallback DLQ en cas d'échec
    if (swiperCanonicalUid !== targetCanonicalUid) {
      try {
        await syncUniversalInteraction(swiperCanonicalUid, targetCanonicalUid, 'KONTAKT');
      } catch (err: any) {
        console.error(`  [Orchestrator] Échec du tissage universel (registerSwipe), basculement DLQ :`, err);
        try {
          await SystemGraphDlqModel.create({
            operationName: 'syncUniversalInteraction_registerSwipe',
            payload: { sourceUid: swiperCanonicalUid, targetUid: targetCanonicalUid, type: 'KONTAKT' },
            error: err.message,
            status: 'PENDING_RETRY',
            retryCount: 0,
            timestamp: new Date()
          });
        } catch (dlqErr) {
          console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
        }
      }
    }

    return result;
  }

  /**
   * 🏅 LE SCEAU DE CONFIANCE (Endorsement Professionnel)
   */
  async endorseSkill(
    data: { targetUid: string; skillName: string; comment?: string },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) throw new IlotError("Identité requise pour apposer un Sceau.", "UNAUTHORIZED", 401);
    
    if (signature.actorUid === data.targetUid) {
      throw new IlotError("On ne peut pas s'auto-attribuer un Sceau de Confiance.", "BAD_REQUEST", 400);
    }

    const targetCanonicalUid = await this.resolveCanonicalUid(data.targetUid);
    const endorserCanonicalUid = await this.resolveCanonicalUid(signature.actorUid);

    const result = await TransactionManager.execute("Apposition du Sceau de Confiance", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const cypher = `
        MATCH (endorser:User {uid: $endorserUid})
        MATCH (target:User {uid: $targetUid})
        MERGE (target)-[:HAS_SKILL]->(sk:Skill {name: $skillName})
        MERGE (endorser)-[r:ENDORSED { createdAt: datetime($now), comment: $comment }]->(sk)
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, {
        endorserUid: endorserCanonicalUid,
        targetUid: targetCanonicalUid,
        skillName: data.skillName.toUpperCase(),
        comment: data.comment || "",
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du scellement de la compétence dans la Matrice.", "INTERNAL_ERROR", 500);
      }

      return { success: true, targetUid: targetCanonicalUid, skill: data.skillName };
    });

    try {
      await syncUniversalInteraction(endorserCanonicalUid, targetCanonicalUid, 'KONTAKT');
    } catch (err: any) {
      console.error(`  [Orchestrator] Échec du tissage universel (endorseSkill), basculement DLQ :`, err);
      try {
        await SystemGraphDlqModel.create({
          operationName: 'syncUniversalInteraction_endorseSkill',
          payload: { sourceUid: endorserCanonicalUid, targetUid: targetCanonicalUid, type: 'KONTAKT' },
          error: err.message,
          status: 'PENDING_RETRY',
          retryCount: 0,
          timestamp: new Date()
        });
      } catch (dlqErr) {
        console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
      }
    }

    return result;
  }

  /**
   * 🌉 LA PASSERELLE (Mise en relation)
   */
  async requestIntroduction(
    data: { intermediaryUid: string; targetUid: string; message: string },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

    const requesterCanonicalUid = await this.resolveCanonicalUid(signature.actorUid);
    const intermediaryCanonicalUid = await this.resolveCanonicalUid(data.intermediaryUid);
    const targetCanonicalUid = await this.resolveCanonicalUid(data.targetUid);

    const result = await TransactionManager.execute("Demande de Passerelle", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const cypher = `
        MATCH (requester:User {uid: $requesterUid})
        MATCH (intermediary:User {uid: $intermediaryUid})
        MATCH (target:User {uid: $targetUid})
        CREATE (requester)-[r:REQUESTED_INTRO { 
          createdAt: datetime($now), 
          message: $message, 
          status: 'PENDING',
          targetUid: $targetUid 
        }]->(intermediary)
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, {
        requesterUid: requesterCanonicalUid,
        intermediaryUid: intermediaryCanonicalUid,
        targetUid: targetCanonicalUid,
        message: data.message,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec de la demande de mise en relation.", "INTERNAL_ERROR", 500);
      }

      return { success: true, status: 'PENDING' };
    });

    try {
      await syncUniversalInteraction(requesterCanonicalUid, intermediaryCanonicalUid, 'KONTAKT');
    } catch (err: any) {
      console.error(`  [Orchestrator] Échec du tissage universel (requestIntroduction), basculement DLQ :`, err);
      try {
        await SystemGraphDlqModel.create({
          operationName: 'syncUniversalInteraction_requestIntroduction',
          payload: { sourceUid: requesterCanonicalUid, targetUid: intermediaryCanonicalUid, type: 'KONTAKT' },
          error: err.message,
          status: 'PENDING_RETRY',
          retryCount: 0,
          timestamp: new Date()
        });
      } catch (dlqErr) {
        console.error("🔥 [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
      }
    }

    return result;
  }
}
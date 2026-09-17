import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { resolveCanonicalUid, safeSyncUniversalInteraction } from '../utils/orchestrator.engine'; // 🛡️ Import des utilitaires globaux

export interface RegisterSwipePayload {
  swiperUid: string;
  targetUid: string;
  action: 'LIKE' | 'PASS';
  [key: string]: unknown;
}

export interface EndorseSkillPayload {
  targetUid: string;
  skillName: string;
  comment?: string;
  [key: string]: unknown;
}

export interface RequestIntroductionPayload {
  intermediaryUid: string;
  targetUid: string;
  message: string;
  [key: string]: unknown;
}

export interface KontaktSyncResult {
  success: boolean;
  action?: 'LIKE' | 'PASS';
  match?: boolean;
  targetUid?: string;
  skill?: string;
  status?: string;
}

export class KontaktOrchestrator {

  /**
   * 💘 GESTION D'UN SWIPE / MATCH (Le Tinder Pro & JDR)
   * Enregistre l'interaction et crée un lien de résonance dans le Graphe si c'est un Match.
   */
  async registerSwipe(
    data: RegisterSwipePayload,
    signature: ActionSignature
  ): Promise<KontaktSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour effectuer un swipe.", "UNAUTHORIZED", 401);
    }

    const swiperCanonicalUid = await resolveCanonicalUid(OiseauModel, data.swiperUid, "Oiseau swiper");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, data.targetUid, "Oiseau cible");

    const result = await TransactionManager.execute("Enregistrement de Swipe Kontakt", async (_mongoSession, neo4jTx) => {
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

    // 🛡️ SÉCURISATION DU TISSAGE UNIVERSEL VIA LA DLQ CENTRALISÉE
    if (swiperCanonicalUid !== targetCanonicalUid) {
      await safeSyncUniversalInteraction(swiperCanonicalUid, targetCanonicalUid, 'KONTAKT', 'registerSwipe');
    }

    return result;
  }

  /**
   * 🏅 LE SCEAU DE CONFIANCE (Endorsement Professionnel)
   */
  async endorseSkill(
    data: EndorseSkillPayload,
    signature: ActionSignature
  ): Promise<KontaktSyncResult> {
    if (!signature.actorUid) throw new IlotError("Identité requise pour apposer un Sceau.", "UNAUTHORIZED", 401);
    
    if (signature.actorUid === data.targetUid) {
      throw new IlotError("On ne peut pas s'auto-attribuer un Sceau de Confiance.", "BAD_REQUEST", 400);
    }

    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, data.targetUid, "Oiseau cible");
    const endorserCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau émetteur");

    const result = await TransactionManager.execute("Apposition du Sceau de Confiance", async (_mongoSession, neo4jTx) => {
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

    await safeSyncUniversalInteraction(endorserCanonicalUid, targetCanonicalUid, 'KONTAKT', 'endorseSkill');

    return result;
  }

  /**
   * 🌉 LA PASSERELLE (Mise en relation)
   */
  async requestIntroduction(
    data: RequestIntroductionPayload,
    signature: ActionSignature
  ): Promise<KontaktSyncResult> {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

    const requesterCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau demandeur");
    const intermediaryCanonicalUid = await resolveCanonicalUid(OiseauModel, data.intermediaryUid, "Oiseau intermédiaire");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, data.targetUid, "Oiseau cible");

    const result = await TransactionManager.execute("Demande de Passerelle", async (_mongoSession, neo4jTx) => {
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

    await safeSyncUniversalInteraction(requesterCanonicalUid, intermediaryCanonicalUid, 'KONTAKT', 'requestIntroduction');

    return result;
  }
}
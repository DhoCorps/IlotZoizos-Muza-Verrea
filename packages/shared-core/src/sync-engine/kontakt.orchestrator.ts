import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { resolveCanonicalUid, safeSyncUniversalInteraction } from '../utils/orchestrator.engine';
import { NotificationOrchestrator } from './notification.orchestrator'; // 🔔 Import du Moteur d'Échos

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

export interface RegisterEndorsementPayload {
  targetUid: string;
  skill: string;
  comment?: string;
}

export interface LeaveReviewPayload {
  targetUid: string;
  rating: number;
  comment: string;
}

export interface RequestIntroductionPayload {
  intermediaryUid: string;
  targetUid: string;
  message: string;
  [key: string]: unknown;
}

// 🚀 NOUVEAU PAYLOAD DE MATCHMAKING ENRICHI
export interface MatchmakingPayload {
  questMaxBudgetCents?: number;
  profileHourlyRateCents?: number;
  questWorkArrangement?: 'FULL_REMOTE' | 'HYBRID' | 'ON_SITE';
  profileRemotePreference?: 'FULL_REMOTE' | 'HYBRID' | 'ON_SITE' | 'FLEXIBLE';
  questContractType?: 'FREELANCE' | 'CDI' | 'CDD' | 'INTERNSHIP' | 'PARTNERSHIP' | 'BOUNTY' | 'OTHER';
  profileProfessionalStatus?: 'FREELANCE' | 'EMPLOYEE' | 'JOB_SEEKER' | 'STUDENT' | 'ENTREPRENEUR' | 'OTHER';
  
  // 🆕 Nouveaux champs d'harmonisation
  questMinBudgetCents?: number | null;
  questBudgetType?: 'DAILY_RATE' | 'FIXED_PRICE' | 'YEARLY_SALARY';
  questEmploymentType?: 'FULL_TIME' | 'PART_TIME' | 'FREELANCE' | 'CONTRACT' | 'INTERNSHIP';
  questExperienceLevel?: 'APPRENTICE' | 'JUNIOR' | 'MID' | 'CONFIRMED' | 'SENIOR' | 'LEAD' | 'MASTER' | 'GURU';
  profileExperienceLevel?: 'APPRENTICE' | 'JUNIOR' | 'MID' | 'CONFIRMED' | 'SENIOR' | 'LEAD' | 'MASTER' | 'GURU';
  questRequiredSkills?: string[];
  profileSkills?: string[];

  // 🏷️ Nouveaux champs pour le matching sémantique (SEO / Tags)
  questTags?: string[];
  profileTags?: string[];
}

export interface MatchmakingResult {
  isFavorable: boolean;
  matchFlag: 'FAVORABLE_MATCH' | 'OUT_OF_BUDGET' | 'INCOMPATIBLE_WORK_ARRANGEMENT' | 'INCOMPATIBLE_CONTRACT_TYPE' | 'MISSING_DATA' | 'INSUFFICIENT_EXPERIENCE' | 'SKILLS_MISMATCH';
  compatibilityScore?: number; // 🆕 Score de matching en %
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
  private notificationOrchestrator: NotificationOrchestrator;

  constructor(notificationOrchestrator?: NotificationOrchestrator) {
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
  }

  /**
   * 💘 GESTION D'UN SWIPE / MATCH (Le Tinder Pro & JDR)
   */
  async registerSwipe(data: RegisterSwipePayload, signature: ActionSignature): Promise<KontaktSyncResult> {
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

    if (swiperCanonicalUid !== targetCanonicalUid) {
      await safeSyncUniversalInteraction(swiperCanonicalUid, targetCanonicalUid, 'KONTAKT', 'registerSwipe');
    }

    if (result.match) {
      try {
        const sysSig: ActionSignature = { actorUid: 'system', capabilities: ['*'] };
        await Promise.allSettled([
          this.notificationOrchestrator.fosterNotification({
            recipientUid: targetCanonicalUid,
            senderUid: swiperCanonicalUid,
            category: 'SOCIAL',
            type: 'KONTAKT_MATCH',
            payload: { message: "Nouvelle résonance ! Un oiseau a répondu à votre appel." }
          }, sysSig),
          this.notificationOrchestrator.fosterNotification({
            recipientUid: swiperCanonicalUid,
            senderUid: targetCanonicalUid,
            category: 'SOCIAL',
            type: 'KONTAKT_MATCH',
            payload: { message: "Nouvelle résonance ! Un oiseau a répondu à votre appel." }
          }, sysSig)
        ]);
      } catch (e) {
        console.error("[Kontakt Orchestrator] Erreur lors de la notification de Match :", e);
      }
    }

    return result;
  }

  /**
   * 🏅 LE SCEAU DE CONFIANCE
   */
  async endorseSkill(data: EndorseSkillPayload, signature: ActionSignature): Promise<KontaktSyncResult> {
    if (!signature.actorUid) throw new IlotError("Identité requise pour apposer un Sceau.", "UNAUTHORIZED", 401);
    if (signature.actorUid === data.targetUid) throw new IlotError("On ne peut pas s'auto-attribuer un Sceau de Confiance.", "BAD_REQUEST", 400);

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

      if (neoResult.records.length === 0) throw new IlotError("Échec du scellement.", "INTERNAL_ERROR", 500);
      return { success: true, targetUid: targetCanonicalUid, skill: data.skillName };
    });

    await safeSyncUniversalInteraction(endorserCanonicalUid, targetCanonicalUid, 'KONTAKT', 'endorseSkill');

    try {
      await this.notificationOrchestrator.fosterNotification({
        recipientUid: targetCanonicalUid,
        senderUid: endorserCanonicalUid,
        category: 'SOCIAL',
        type: 'SKILL_ENDORSED',
        payload: { message: `Un Oiseau a apposé un Sceau de Confiance sur votre compétence : ${data.skillName.toUpperCase()}.` }
      }, signature);
    } catch (e) {
      console.error("[Kontakt Orchestrator] Erreur de notification Sceau :", e);
    }

    return result;
  }

  /**
   * 🤝 RECOMMANDATION DIRECTE
   */
  async registerEndorsement(data: RegisterEndorsementPayload, signature: ActionSignature): Promise<KontaktSyncResult> {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);
    if (signature.actorUid === data.targetUid) throw new IlotError("On ne peut pas s'auto-recommander.", "BAD_REQUEST", 400);

    const endorserCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau émetteur");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, data.targetUid, "Oiseau cible");

    const result = await TransactionManager.execute("Enregistrement VOUCHES_FOR", async (_mongoSession, neo4jTx) => {
      const now = new Date();
      const cypher = `
        MATCH (u1:User {uid: $endorserUid})
        MATCH (u2:User {uid: $targetUid})
        MERGE (u1)-[r:VOUCHES_FOR { skill: $skill }]->(u2)
        ON CREATE SET r.createdAt = datetime($now), r.comment = $comment
        ON MATCH SET r.updatedAt = datetime($now), r.comment = $comment
        RETURN r
      `;
      const neoResult = await neo4jTx.run(cypher, {
        endorserUid: endorserCanonicalUid,
        targetUid: targetCanonicalUid,
        skill: data.skill.toUpperCase(),
        comment: data.comment || "",
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) throw new IlotError("Échec de la recommandation.", "INTERNAL_ERROR", 500);
      return { success: true, skill: data.skill };
    });

    await safeSyncUniversalInteraction(endorserCanonicalUid, targetCanonicalUid, 'KONTAKT', 'registerEndorsement');

    try {
      await this.notificationOrchestrator.fosterNotification({
        recipientUid: targetCanonicalUid,
        senderUid: endorserCanonicalUid,
        category: 'SOCIAL',
        type: 'VOUCH_RECEIVED',
        payload: { message: `Un Oiseau vient de vous recommander pour : ${data.skill.toUpperCase()}.` }
      }, signature);
    } catch (e) {
      console.error("[Kontakt Orchestrator] Erreur de notification Recommandation :", e);
    }

    return result;
  }

  /**
   * ⭐ LAISSER UN AVIS
   */
  async leaveReview(data: LeaveReviewPayload, signature: ActionSignature): Promise<KontaktSyncResult> {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

    const reviewerCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau évaluateur");
    const targetCanonicalUid = await resolveCanonicalUid(OiseauModel, data.targetUid, "Oiseau évalué");

    const result = await TransactionManager.execute("Dépôt d'Avis", async (_mongoSession, neo4jTx) => {
      const now = new Date();
      const checkCypher = `MATCH (u1:User {uid: $reviewerUid})-[r:HIRED]-(u2:User {uid: $targetUid}) RETURN r`;
      const checkResult = await neo4jTx.run(checkCypher, { reviewerUid: reviewerCanonicalUid, targetUid: targetCanonicalUid });

      if (checkResult.records.length === 0) {
        throw new IlotError("Vous ne pouvez évaluer qu'un oiseau avec lequel vous avez collaboré.", "FORBIDDEN", 403);
      }

      const reviewCypher = `
        MATCH (u1:User {uid: $reviewerUid})
        MATCH (u2:User {uid: $targetUid})
        CREATE (u1)-[r:REVIEWED { rating: $rating, comment: $comment, createdAt: datetime($now) }]->(u2)
        RETURN r
      `;
      await neo4jTx.run(reviewCypher, {
        reviewerUid: reviewerCanonicalUid,
        targetUid: targetCanonicalUid,
        rating: data.rating,
        comment: data.comment,
        now: now.toISOString()
      });

      return { success: true, status: 'REVIEW_PUBLISHED' };
    });

    await safeSyncUniversalInteraction(reviewerCanonicalUid, targetCanonicalUid, 'KONTAKT', 'leaveReview');

    try {
      await this.notificationOrchestrator.fosterNotification({
        recipientUid: targetCanonicalUid,
        senderUid: reviewerCanonicalUid,
        category: 'SOCIAL',
        type: 'REVIEW_RECEIVED',
        payload: { message: `Un Oiseau a laissé un avis sur votre profil après votre collaboration.` }
      }, signature);
    } catch (e) {
      console.error("[Kontakt Orchestrator] Erreur de notification Avis :", e);
    }

    return result;
  }

  /**
   * 🌉 LA PASSERELLE (Mise en relation)
   */
  async requestIntroduction(data: RequestIntroductionPayload, signature: ActionSignature): Promise<KontaktSyncResult> {
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
          createdAt: datetime($now), message: $message, status: 'PENDING', targetUid: $targetUid 
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

      if (neoResult.records.length === 0) throw new IlotError("Échec de la demande.", "INTERNAL_ERROR", 500);
      return { success: true, status: 'PENDING' };
    });

    await safeSyncUniversalInteraction(requesterCanonicalUid, intermediaryCanonicalUid, 'KONTAKT', 'requestIntroduction');

    try {
      await this.notificationOrchestrator.fosterNotification({
        recipientUid: intermediaryCanonicalUid,
        senderUid: requesterCanonicalUid,
        category: 'SOCIAL',
        type: 'INTRO_REQUESTED',
        payload: { message: `Un Oiseau sollicite votre aide pour une mise en relation.` }
      }, signature);
    } catch (e) {
      console.error("[Kontakt Orchestrator] Erreur de notification Passerelle :", e);
    }

    return result;
  }

  /**
   * ⚖️ MOTEUR DE MATCHMAKING ENRICHI (Quêtes & Profils CV)
   * Logique enrichie croisant télétravail, statut pro, budget, EXPÉRIENCE, COMPÉTENCES et TAGS SEO !
   */
  async matchmakingEngine(payload: MatchmakingPayload): Promise<MatchmakingResult> {
    if (
      payload.questMaxBudgetCents === undefined || 
      payload.profileHourlyRateCents === undefined ||
      !payload.questWorkArrangement ||
      !payload.profileRemotePreference
    ) {
      return { isFavorable: false, matchFlag: 'MISSING_DATA', compatibilityScore: 0 };
    }

    // 1. 🌍 Compatibilité Géographique (Télétravail)
    if (payload.questWorkArrangement === 'ON_SITE' && payload.profileRemotePreference === 'FULL_REMOTE') {
      return { isFavorable: false, matchFlag: 'INCOMPATIBLE_WORK_ARRANGEMENT', compatibilityScore: 0 };
    }
    if (payload.questWorkArrangement === 'FULL_REMOTE' && payload.profileRemotePreference === 'ON_SITE') {
      return { isFavorable: false, matchFlag: 'INCOMPATIBLE_WORK_ARRANGEMENT', compatibilityScore: 0 };
    }

    // 2. 📜 Compatibilité Contractuelle
    if (payload.questContractType && payload.profileProfessionalStatus) {
      if (['CDI', 'CDD'].includes(payload.questContractType) && payload.profileProfessionalStatus === 'FREELANCE') {
        return { isFavorable: false, matchFlag: 'INCOMPATIBLE_CONTRACT_TYPE', compatibilityScore: 0 };
      }
    }

    // 3. 💰 Compatibilité Budgétaire
    if (payload.profileHourlyRateCents > payload.questMaxBudgetCents) {
      return { isFavorable: false, matchFlag: 'OUT_OF_BUDGET', compatibilityScore: 0 };
    }

    // 4. 🛡️ Compatibilité d'Expérience (Échelle RPG)
    if (payload.questExperienceLevel && payload.profileExperienceLevel) {
      const expWeights: Record<string, number> = {
        'APPRENTICE': 0, 'JUNIOR': 1, 'MID': 2, 'CONFIRMED': 3, 'SENIOR': 4, 'LEAD': 5, 'MASTER': 6, 'GURU': 7
      };
      const questWeight = expWeights[payload.questExperienceLevel] || 0;
      const profileWeight = expWeights[payload.profileExperienceLevel] || 0;
      
      if (profileWeight < questWeight) {
        return { isFavorable: false, matchFlag: 'INSUFFICIENT_EXPERIENCE', compatibilityScore: 30 };
      }
    }

    let compatibilityScore = 100;

    // 5. 🔮 Compatibilité des Compétences (Calcul de Résonance)
    if (payload.questRequiredSkills && payload.questRequiredSkills.length > 0 && payload.profileSkills) {
      const profileSkillsLower = payload.profileSkills.map(s => s.toLowerCase());
      const missingSkills = payload.questRequiredSkills.filter(s => !profileSkillsLower.includes(s.toLowerCase()));
      
      const matchRatio = (payload.questRequiredSkills.length - missingSkills.length) / payload.questRequiredSkills.length;
      
      // Si moins de 50% de match sur les skills stricts requis, on rejette poliment
      if (matchRatio < 0.5) {
        return { 
          isFavorable: false, 
          matchFlag: 'SKILLS_MISMATCH', 
          compatibilityScore: Math.round(matchRatio * 100) 
        };
      }
      
      compatibilityScore = Math.round(matchRatio * 100);
    }

    // 6. 🏷️ Compatibilité des Tags (Bonus SEO / Résonance thématique)
    if (payload.questTags && payload.questTags.length > 0 && payload.profileTags) {
      const profileTagsLower = payload.profileTags.map(t => t.toLowerCase());
      const matchingTags = payload.questTags.filter(t => profileTagsLower.includes(t.toLowerCase()));
      
      // Bonus : +5 points par tag en commun, plafonné à +20%
      if (matchingTags.length > 0) {
         const tagBonus = Math.min(20, matchingTags.length * 5);
         compatibilityScore = Math.min(100, compatibilityScore + tagBonus);
      }
    }

    return { isFavorable: true, matchFlag: 'FAVORABLE_MATCH', compatibilityScore };
  }
}
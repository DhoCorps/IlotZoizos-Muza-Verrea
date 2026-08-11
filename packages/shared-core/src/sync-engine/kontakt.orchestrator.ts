// packages/shared-core/src/sync-engine/kontakt.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class KontaktOrchestrator {

  /**
   * Utilitaire interne pour résoudre strictement l'UID canonique via la Silice (MongoDB)
   * Permet d'éradiquer les "FULL GRAPH SCANS" dans Neo4j.
   */
  private async resolveCanonicalUid(identifier: string): Promise<string> {
    const user = await OiseauModel.findOne({ 
      $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }] 
    }).lean();
    
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

    // Résolution stricte des identités AVANT la transaction pour alléger Neo4j
    const swiperCanonicalUid = await this.resolveCanonicalUid(data.swiperUid);
    const targetCanonicalUid = await this.resolveCanonicalUid(data.targetUid);

    return await TransactionManager.execute("Enregistrement de Swipe Kontakt", async (mongoSession, neo4jTx) => {
      let isMatch = false;

      if (data.action === 'LIKE') {
        // 1. Vérifier si la cible a aussi liké le swiper (Recherche stricte sur index)
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

        // 2. Créer la relation de swipe et le match éventuel
        const swipeQuery = `
          MATCH (u1:User {uid: $swiperUid})
          MATCH (u2:User {uid: $targetUid})
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime() }]->(u2)
          ${isMatch ? 'CREATE (u1)-[:MATCHED_WITH { createdAt: datetime() }]->(u2) CREATE (u2)-[:MATCHED_WITH { createdAt: datetime() }]->(u1)' : ''}
          RETURN $isMatch AS match
        `;

        await neo4jTx.run(swipeQuery, {
          swiperUid: swiperCanonicalUid,
          targetUid: targetCanonicalUid,
          action: data.action,
          isMatch
        });
      } else if (data.action === 'PASS') {
        const passQuery = `
          MATCH (u1:User {uid: $swiperUid})
          MATCH (u2:User {uid: $targetUid})
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime() }]->(u2)
          RETURN s
        `;
        await neo4jTx.run(passQuery, {
          swiperUid: swiperCanonicalUid,
          targetUid: targetCanonicalUid,
          action: data.action
        });
      }

      return {
        success: true,
        action: data.action,
        match: isMatch
      };
    });
  }

  /**
   * 🏅 LE SCEAU DE CONFIANCE (Endorsement Professionnel)
   * Approuve publiquement la compétence technique ou artistique d'un autre oiseau.
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

    return await TransactionManager.execute("Apposition du Sceau de Confiance", async (mongoSession, neo4jTx) => {
      const cypher = `
        MATCH (endorser:User {uid: $endorserUid})
        MATCH (target:User {uid: $targetUid})
        MERGE (target)-[:HAS_SKILL]->(sk:Skill {name: $skillName})
        MERGE (endorser)-[r:ENDORSED { createdAt: datetime(), comment: $comment }]->(sk)
        RETURN r
      `;

      const result = await neo4jTx.run(cypher, {
        endorserUid: endorserCanonicalUid,
        targetUid: targetCanonicalUid,
        skillName: data.skillName.toUpperCase(),
        comment: data.comment || ""
      });

      if (result.records.length === 0) {
        throw new IlotError("Échec du scellement de la compétence dans la Matrice.", "INTERNAL_ERROR", 500);
      }

      return { success: true, targetUid: targetCanonicalUid, skill: data.skillName };
    });
  }

  /**
   * 🌉 LA PASSERELLE (Mise en relation)
   * Demande à un oiseau intermédiaire d'introduire l'auteur de la requête à une cible.
   */
  async requestIntroduction(
    data: { intermediaryUid: string; targetUid: string; message: string },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

    const requesterCanonicalUid = await this.resolveCanonicalUid(signature.actorUid);
    const intermediaryCanonicalUid = await this.resolveCanonicalUid(data.intermediaryUid);
    const targetCanonicalUid = await this.resolveCanonicalUid(data.targetUid);

    return await TransactionManager.execute("Demande de Passerelle", async (mongoSession, neo4jTx) => {
      const cypher = `
        MATCH (requester:User {uid: $requesterUid})
        MATCH (intermediary:User {uid: $intermediaryUid})
        MATCH (target:User {uid: $targetUid})
        CREATE (requester)-[r:REQUESTED_INTRO { 
          createdAt: datetime(), 
          message: $message, 
          status: 'PENDING',
          targetUid: $targetUid 
        }]->(intermediary)
        RETURN r
      `;

      const result = await neo4jTx.run(cypher, {
        requesterUid: requesterCanonicalUid,
        intermediaryUid: intermediaryCanonicalUid,
        targetUid: targetCanonicalUid,
        message: data.message
      });

      if (result.records.length === 0) {
        throw new IlotError("Échec de la demande de mise en relation.", "INTERNAL_ERROR", 500);
      }

      return { success: true, status: 'PENDING' };
    });
  }
}
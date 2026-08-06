// packages/shared-core/src/sync-engine/kontakt.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class KontaktOrchestrator {

  /**
   * 💘 GESTION D'UN SWIPE / MATCH (Le Tinder Pro & JDR)
   * Enregistre l'interaction et crée un lien de résonance dans le Graphe si c'est un Match.
   * Supporte l'identification par uid ou slug pour plus de robustesse.
   */
  async registerSwipe(
    data: { swiperUid: string; targetUid: string; action: 'LIKE' | 'PASS' },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour effectuer un swipe.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Enregistrement de Swipe Kontakt", async (mongoSession, neo4jTx) => {
      let isMatch = false;

      if (data.action === 'LIKE') {
        // 1. Vérifier si la cible a aussi liké le swiper (support uid ou slug)
        const checkQuery = `
          MATCH (target:User) WHERE target.uid = $targetUid OR target.slug = $targetUid
          MATCH (swiper:User) WHERE swiper.uid = $swiperUid OR swiper.slug = $swiperUid
          MATCH (target)-[r:SWIPED { action: 'LIKE' }]->(swiper)
          RETURN r
        `;
        const checkResult = await neo4jTx.run(checkQuery, {
          swiperUid: data.swiperUid,
          targetUid: data.targetUid
        });

        isMatch = checkResult.records.length > 0;

        // 2. Créer la relation de swipe et le match éventuel en résolvant par uid ou slug
        const swipeQuery = `
          MATCH (u1:User) WHERE u1.uid = $swiperUid OR u1.slug = $swiperUid
          MATCH (u2:User) WHERE u2.uid = $targetUid OR u2.slug = $targetUid
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime() }]->(u2)
          ${isMatch ? 'CREATE (u1)-[:MATCHED_WITH { createdAt: datetime() }]->(u2) CREATE (u2)-[:MATCHED_WITH { createdAt: datetime() }]->(u1)' : ''}
          RETURN $isMatch AS match
        `;

        await neo4jTx.run(swipeQuery, {
          swiperUid: data.swiperUid,
          targetUid: data.targetUid,
          action: data.action,
          isMatch
        });
      } else if (data.action === 'PASS') {
        const passQuery = `
          MATCH (u1:User) WHERE u1.uid = $swiperUid OR u1.slug = $swiperUid
          MATCH (u2:User) WHERE u2.uid = $targetUid OR u2.slug = $targetUid
          CREATE (u1)-[s:SWIPED { action: $action, createdAt: datetime() }]->(u2)
          RETURN s
        `;
        await neo4jTx.run(passQuery, {
          swiperUid: data.swiperUid,
          targetUid: data.targetUid,
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
}
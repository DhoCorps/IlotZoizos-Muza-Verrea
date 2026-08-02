// packages/shared-core/src/sync-engine/kontakt.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class KontaktOrchestrator {

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

    return await TransactionManager.execute("Enregistrement de Swipe Kontakt", async (mongoSession, neo4jTx) => {
      let isMatch = false;

      if (data.action === 'LIKE') {
        // Vérifier si la cible a aussi liké le swiper dans le graphe
        const checkQuery = `
          MATCH (target:User { uid: $targetUid })-[r:SWIPED { action: 'LIKE' }]->(swiper:User { uid: $swiperUid })
          RETURN r
        `;
        const checkResult = await neo4jTx.run(checkQuery, {
          swiperUid: data.swiperUid,
          targetUid: data.targetUid
        });

        isMatch = checkResult.records.length > 0;

        // Créer ou mettre à jour la relation de swipe
        const swipeQuery = `
          MERGE (u1:User { uid: $swiperUid })
          MERGE (u2:User { uid: $targetUid })
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
      }

      return {
        success: true,
        action: data.action,
        match: isMatch
      };
    });
  }
}
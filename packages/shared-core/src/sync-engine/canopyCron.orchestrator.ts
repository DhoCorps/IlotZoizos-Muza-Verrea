import { CanopyAwardModel } from '@ilot/infrastructure';
import { CANOPY_AWARDS_CATALOG } from '../constants/canopyAwardRegistry.config';
import { TransactionManager } from './transactionManager';

export class CanopyCronOrchestrator {
  /**
   * Exécute la clôture du cycle et distribue tous les trophées enregistrés dans le catalogue.
   * Procède à une double écriture atomique (Silice MongoDB + Graphe Neo4j).
   */
  static async closeCycle(yearMonth: string) {
    console.log(`🌀 [Canopy Cron] Début de la clôture du cycle pour ${yearMonth}...`);
    
    // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now' pour la clôture
    const now = new Date();

    for (const [key, definition] of Object.entries(CANOPY_AWARDS_CATALOG)) {
      try {
        // Détermination du vainqueur (via l'évaluateur custom du trophée)
        let winnerUid = null;
        if (definition.evaluator) {
          winnerUid = await definition.evaluator({ yearMonth });
        }

        if (!winnerUid) {
          console.warn(`⚠️ [Canopy Cron] Aucun vainqueur trouvé pour le trophée : ${definition.title}`);
          continue;
        }

        // 🌿 DÉLÉGATION AU TRANSACTION MANAGER (Double Écriture)
        await TransactionManager.execute(`Attribution Trophée ${key}`, async (mongoSession, neo4jTx) => {
          // 1. Enregistrement propre dans la base (upsert pour éviter les doublons en cas de relance)
          await CanopyAwardModel.findOneAndUpdate(
            { yearMonth, awardKey: key },
            {
              yearMonth,
              awardKey: key,
              title: definition.title,
              recipientUid: winnerUid,
              category: definition.category,
              loreDescription: definition.defaultLore,
              awardedAt: now,
            },
            { upsert: true, new: true, session: mongoSession }
          );

          // 2. Ancrage dans le Graphe (Neo4j)
          await neo4jTx.run(`
            MATCH (u:User { uid: $winnerUid })
            MERGE (a:CanopyAward { awardKey: $awardKey, yearMonth: $yearMonth })
            ON CREATE SET 
              a.title = $title, 
              a.category = $category, 
              a.awardedAt = datetime($now)
            MERGE (u)-[:RECEIVED_AWARD { at: datetime($now) }]->(a)
          `, {
            winnerUid,
            awardKey: key,
            yearMonth,
            title: definition.title,
            category: definition.category,
            now: now.toISOString()
          });
        });

        console.log(`✨ [Canopy Cron] Trophée attribué : "${definition.title}" -> ${winnerUid}`);
      } catch (error) {
        console.error(`🔥 [Canopy Cron] Erreur lors de l'attribution du trophée ${key}:`, error);
      }
    }

    console.log(`🌿 [Canopy Cron] Clôture du cycle ${yearMonth} achevée avec succès.`);
  }
}
import { CanopyAwardModel } from '@ilot/infrastructure';
import { CANOPY_AWARDS_CATALOG } from '@/constants/canopyAwardRegistry.config';

export class CanopyCronOrchestrator {
  /**
   * Exécute la clôture du cycle et distribue tous les trophées enregistrés dans le catalogue.
   */
  static async closeCycle(yearMonth: string) {
    console.log(`🌀 [Canopy Cron] Début de la clôture du cycle pour ${yearMonth}...`);

    for (const [key, definition] of Object.entries(CANOPY_AWARDS_CATALOG)) {
      try {
        // Détermination du vainqueur (soit via l'évaluateur custom du trophée, soit par défaut)
        let winnerUid = null;
        if (definition.evaluator) {
          winnerUid = await definition.evaluator({ yearMonth });
        }

        if (!winnerUid) {
          console.warn(`⚠️ [Canopy Cron] Aucun vainqueur trouvé pour le trophée : ${definition.title}`);
          continue;
        }

        // Enregistrement propre dans la base (upsert pour éviter les doublons en cas de relance)
        await CanopyAwardModel.findOneAndUpdate(
          { yearMonth, awardKey: key },
          {
            yearMonth,
            awardKey: key,
            title: definition.title,
            recipientUid: winnerUid,
            category: definition.category,
            loreDescription: definition.defaultLore,
          },
          { upsert: true, new: true }
        );

        console.log(`✨ [Canopy Cron] Trophée attribué : "${definition.title}" -> ${winnerUid}`);
      } catch (error) {
        console.error(`🔥 [Canopy Cron] Erreur lors de l'attribution du trophée ${key}:`, error);
      }
    }

    console.log(`🌿 [Canopy Cron] Clôture du cycle ${yearMonth} achevée avec succès.`);
  }
}
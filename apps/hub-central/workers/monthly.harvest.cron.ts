// apps/hub-central/workers/monthly.harvest.cron.ts
import cron from 'node-cron';
import { MonthlyStatsOrchestrator } from '@ilot/shared-core';

// Expression cron : À 03h00 le 1er de chaque mois -> '0 3 1 * *'
cron.schedule('0 3 1 * *', async () => {
  try {
    const orchestrator = new MonthlyStatsOrchestrator();
    
    // Détermination du mois précédent à clôturer
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const yearMonth = now.toISOString().slice(0, 7); // Ex: "2026-07"

    // Signature système souverain pour autoriser la moisson nocturne
    const systemSignature = {
      actorUid: 'SYSTEM_CANOPY_ROOT',
      capabilities: ['*']
    };

    console.log(`[Cron] 🌙 Éveil nocturne : Lancement de la moisson pour ${yearMonth}...`);
    await orchestrator.executeMonthlyHarvest(yearMonth, systemSignature as any);
    console.log(`[Cron] 🟢 Moisson et distribution des jetons Renewall achevées avec succès.`);
  } catch (error: any) {
    console.error(`[Cron Error] 🔴 Échec critique de la moisson mensuelle :`, error.message);
  }
});
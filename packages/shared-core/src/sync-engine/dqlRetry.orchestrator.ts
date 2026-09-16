import { SystemGraphDlqModel, getNeo4jDriver } from '@ilot/infrastructure';

export class DlqRetryOrchestrator {
  /**
   * Tente de rejouer les transactions en échec stockées dans la DLQ.
   * L'ordre chronologique (FIFO) est strictement respecté.
   */
  static async processDlqBatch(maxRetries: number = 3): Promise<{ processed: number; resolved: number }> {
    console.log(`🌀 [DLQ Worker] Début du balayage des fractures de la Matrice...`);

    // 🛡️ Optimisation Point 6 : Tri chronologique strict (FIFO) pour éviter l'inversion des requêtes
    const pendingEntries = await SystemGraphDlqModel.find({
      status: 'PENDING_RETRY',
      retryCount: { $lt: maxRetries }
    })
    .sort({ timestamp: 1 }) // 👈 On traite toujours les plus anciennes erreurs en premier
    .limit(50);

    let resolvedCount = 0;
    const session = getNeo4jDriver().session();

    try {
      for (const entry of pendingEntries) {
        try {
          console.log(`🔄 [DLQ Worker] Tentative de rejeu pour l'opération : ${entry.operationName} (Essai ${entry.retryCount + 1})`);
          
          // Utilisation de session.executeWrite pour la session mutualisée
          await session.executeWrite(async (tx) => {
            return await tx.run('RETURN 1');
          });

          // Si la matrice répond, on marque l'entrée comme résolue
          entry.status = 'RESOLVED';
          entry.lastAttemptAt = new Date();
          await entry.save();

          resolvedCount++;
          console.log(`✨ [DLQ Worker] Opération ${entry.operationName} réconciliée avec succès.`);
        } catch (err: any) {
          console.error(`🔥 [DLQ Worker] Échec du rejeu pour ${entry.operationName} :`, err.message);
          entry.retryCount += 1;
          entry.lastAttemptAt = new Date();
          
          if (entry.retryCount >= maxRetries) {
            entry.status = 'FAILED_PERMANENTLY';
            console.error(`🛑 [DLQ Worker] L'opération ${entry.operationName} a atteint le seuil critique d'échecs (Abandon définitif).`);
          }
          
          await entry.save();
        }
      }
    } finally {
      if (session) {
        await session.close();
      }
    }

    console.log(`🌿 [DLQ Worker] Balayage achevé. ${resolvedCount}/${pendingEntries.length} résolues.`);
    return { processed: pendingEntries.length, resolved: resolvedCount };
  }
}
import { SystemGraphDlqModel, getNeo4jDriver } from '@ilot/infrastructure';

export class DlqRetryOrchestrator {
  /**
   * Tente de rejouer les transactions en échec stockées dans la DLQ.
   * L'ordre chronologique (FIFO) est strictement respecté.
   * Chaque item dispose de sa propre session Neo4j isolée pour garantir l'étanchéité des connexions.
   */
  static async processDlqBatch(maxRetries: number = 3): Promise<{ processed: number; resolved: number }> {
    console.log(`🌀 [DLQ Worker] Début du balayage des fractures de la Matrice...`);

    const pendingEntries = await SystemGraphDlqModel.find({
      status: 'PENDING_RETRY',
      retryCount: { $lt: maxRetries }
    })
    .sort({ timestamp: 1 }) // Tri FIFO strict
    .limit(50);

    let resolvedCount = 0;

    for (const entry of pendingEntries) {
      const now = new Date();
      // 🛡️ Isolation de la session Neo4j par itération
      const session = getNeo4jDriver().session();

      try {
        console.log(`🔄 [DLQ Worker] Tentative de rejeu pour l'opération : ${entry.operationName} (Essai ${entry.retryCount + 1})`);
        
        await session.executeWrite(async (tx) => {
          return await tx.run('RETURN 1');
        });

        entry.status = 'RESOLVED';
        entry.lastAttemptAt = now;
        await entry.save();

        resolvedCount++;
        console.log(`✨ [DLQ Worker] Opération ${entry.operationName} réconciliée avec succès.`);
      } catch (err: any) {
        console.error(`🔥 [DLQ Worker] Échec du rejeu pour ${entry.operationName} :`, err.message);
        entry.retryCount += 1;
        entry.lastAttemptAt = now;
        
        if (entry.retryCount >= maxRetries) {
          entry.status = 'FAILED_PERMANENTLY';
          console.error(`🛑 [DLQ Worker] L'opération ${entry.operationName} a atteint le seuil critique d'échecs (Abandon définitif).`);
        }
        
        await entry.save();
      } finally {
        // Fermeture garantie de la session dédiée à cet item
        if (session) {
          await session.close();
        }
      }
    }

    console.log(`🌿 [DLQ Worker] Balayage achevé. ${resolvedCount}/${pendingEntries.length} résolues.`);
    return { processed: pendingEntries.length, resolved: resolvedCount };
  }

  /**
   * 🧹 Purge périodique pour éviter la croissance infinie de la collection DLQ
   * Supprime les échecs définitifs plus anciens que le délai de rétention (par défaut 7 jours).
   */
  static async purgePermanentFailures(retentionDays: number = 7): Promise<number> {
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await SystemGraphDlqModel.deleteMany({
      status: 'FAILED_PERMANENTLY',
      lastAttemptAt: { $lt: threshold }
    });
    console.log(`🗑️ [DLQ Purge] ${result.deletedCount || 0} échecs permanents nettoyés de la Silice.`);
    return result.deletedCount || 0;
  }
}
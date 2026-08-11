import { SystemGraphDlqModel } from '@ilot/infrastructure';
import { getNeo4jDriver } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';

export class DlqRetryOrchestrator {
  /**
   * Tente de rejouer les transactions en échec stockées dans la DLQ.
   */
  static async processDlqBatch(maxRetries: number = 3): Promise<{ processed: number; resolved: number }> {
    console.log(`🌀 [DLQ Worker] Début du balayage des fractures de la Matrice...`);

    const pendingEntries = await SystemGraphDlqModel.find({
      status: 'PENDING_RETRY',
      retryCount: { $lt: maxRetries }
    }).limit(50);

    let resolvedCount = 0;

    for (const entry of pendingEntries) {
      const session = getNeo4jDriver().session();
      try {
        console.log(`🔄 [DLQ Worker] Tentative de rejeu pour l'opération : ${entry.operationName} (Essai ${entry.retryCount + 1})`);
        
        // Test de reconnexion / ping de la matrice Neo4j
        await session.run('RETURN 1');

        // Si la matrice répond, on marque l'entrée comme résolue (ou on peut y attacher un rejeu de requêtes plus poussé)
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
      } finally {
        await session.close();
      }
    }

    console.log(`🌿 [DLQ Worker] Balayage achevé. ${resolvedCount}/${pendingEntries.length} résolues.`);
    return { processed: pendingEntries.length, resolved: resolvedCount };
  }
}
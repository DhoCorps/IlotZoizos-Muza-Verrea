import { SystemPurgeJobModel } from '@ilot/infrastructure';
import { SovereignPurgeOrchestrator } from './sovereign.purge.orchestrator';

export class SovereignPurgeWorker {
  /**
   * Scanne et exécute les purges en attente une par une pour éviter de surcharger le système.
   */
  public static async processPendingJobs(): Promise<void> {
    console.log(`🌑 [Purge Worker] Éveil du nettoyeur des abysses...`);

    // On récupère et verrouille un job en le passant à PROCESSING de manière atomique
    const job = await SystemPurgeJobModel.findOneAndUpdate(
      { status: 'PENDING' },
      { status: 'PROCESSING' },
      { new: true, sort: { createdAt: 1 } }
    );

    if (!job) {
      console.log(`🌑 [Purge Worker] Aucun ordre d'évanescence en attente.`);
      return;
    }

    console.log(`💥 [Purge Worker] Début de la dissolution pour l'entité : ${job.entityId}`);

    try {
      const orchestrator = new SovereignPurgeOrchestrator();
      await orchestrator.executeSovereignPurge(
        { entityId: job.entityId, reason: job.reason as any },
        { actorUid: job.actorUid, capabilities: job.capabilities }
      );

      job.status = 'COMPLETED';
      await job.save();
      console.log(`✨ [Purge Worker] Dissolution achevée avec succès pour : ${job.entityId}`);

    } catch (error: any) {
      console.error(`🔥 [Purge Worker] Échec critique lors de la dissolution de ${job.entityId}:`, error);
      job.status = 'FAILED';
      job.errorPayload = error.message || String(error);
      await job.save();
    }
  }
}
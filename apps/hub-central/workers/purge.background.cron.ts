import { SovereignPurgeWorker } from '@ilot/shared-core';

export class PurgeBackgroundCron {
  /**
   * Tâche planifiée pour balayer les purges en attente.
   */
  public static async execute(): Promise<void> {
    try {
      await SovereignPurgeWorker.processPendingJobs();
    } catch (error) {
      console.error("🔥 [Cron Purge] Erreur critique lors de l'exécution du worker :", error);
    }
  }
}
import { DlqRetryOrchestrator } from '@ilot/shared-core';

export class DlqRetryCron {
  /**
   * Point d'entrée déclenché par le planificateur de tâches de la Canopée.
   */
  public static async execute(): Promise<void> {
    try {
      await DlqRetryOrchestrator.processDlqBatch();
    } catch (error) {
      console.error("🔥 [Cron DLQ] Erreur critique lors de l'exécution du worker :", error);
    }
  }
}
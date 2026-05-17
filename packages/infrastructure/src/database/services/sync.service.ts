// packages/shared-core/src/services/sync.service.ts
import { OiseauOrchestrator } from '../../../../shared-core/src/sync-engine/user.orchestrator';
import { TeamOrchestrator } from '../../../../shared-core/src/sync-engine/team.orchestrator';
import { ProjectOrchestrator } from '../../../../shared-core/src/sync-engine/project.orchestrator';
import { TaskOrchestrator } from '../../../../shared-core/src/sync-engine/task.orchestrator';
import { KanbanOrchestrator } from '../../../../shared-core/src/sync-engine/kanban.orchestrator';

/**
 * 🛰️ SYNC SERVICE
 * Le Registre central des Orchestrateurs. 
 * Permet d'accéder à toutes les méthodes de synchronisation depuis un point unique.
 */
class SyncService {
  public readonly oiseaux = new OiseauOrchestrator();
  public readonly teams = new TeamOrchestrator();
  public readonly projects = new ProjectOrchestrator();
  public readonly tasks = new TaskOrchestrator();
  public readonly kanban = new KanbanOrchestrator();

  /**
   * Vérification de l'état des deux mondes.
   */
  async healthCheck() {
    // Logique pour vérifier si Mongo et Neo4j sont "UP"
    return { status: 'UP', timestamp: new Date() };
  }
}

export const syncService = new SyncService();
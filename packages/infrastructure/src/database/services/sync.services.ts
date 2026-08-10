// packages/infrastructure/src/database/services/sync.service.ts
import { OiseauOrchestrator } from '../../../../shared-core/src/sync-engine/user.orchestrator';
import { TeamOrchestrator } from '../../../../shared-core/src/sync-engine/team.orchestrator';
import { ProjectOrchestrator } from '../../../../shared-core/src/sync-engine/project.orchestrator';
import { TaskOrchestrator } from '../../../../shared-core/src/sync-engine/task.orchestrator';
import { KanbanOrchestrator } from '../../../../shared-core/src/sync-engine/kanban.orchestrator';

/**
 * ⚡ SERVICE DE SYNCHRONISATION UNIFIÉ
 * Utilise des getters paresseux pour éviter les pièges de dépendance circulaire au démarrage.
 */
class SyncService {
  private _oiseaux?: OiseauOrchestrator;
  private _teams?: TeamOrchestrator;
  private _projects?: ProjectOrchestrator;
  private _tasks?: TaskOrchestrator;
  private _kanban?: KanbanOrchestrator;

  public get oiseaux() {
    if (!this._oiseaux) {
      this._oiseaux = new OiseauOrchestrator();
    }
    return this._oiseaux;
  }

  public get teams() {
    if (!this._teams) {
      this._teams = new TeamOrchestrator();
    }
    return this._teams;
  }

  public get projects() {
    if (!this._projects) {
      this._projects = new ProjectOrchestrator();
    }
    return this._projects;
  }

  public get tasks() {
    if (!this._tasks) {
      this._tasks = new TaskOrchestrator();
    }
    return this._tasks;
  }

  public get kanban() {
    if (!this._kanban) {
      this._kanban = new KanbanOrchestrator();
    }
    return this._kanban;
  }
}

export const syncService = new SyncService();
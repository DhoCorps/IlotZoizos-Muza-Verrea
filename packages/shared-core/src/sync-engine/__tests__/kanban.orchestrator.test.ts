import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KanbanOrchestrator } from '../kanban.orchestrator';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import * as OrchestratorEngine from '../../utils/orchestrator.engine'; // On importe TOUT le module
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

// 🛡️ Mock unifié et sécurisé de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TaskModel: {
      findOneAndUpdate: vi.fn(),
      bulkWrite: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] })
      };
      return await cb(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('KanbanOrchestrator - Gestion du Tableau et des Atomes', () => {
  let orchestrator: KanbanOrchestrator;
  const adminSignature = { actorUid: 'bird_admin', capabilities: [CAPABILITIES.TASK.UPDATE] };
  const restrictedSignature = { actorUid: 'bird_visitor', capabilities: [] };

  // On prépare notre spy pour l'utilitaire local
  let safeSyncSpy: any; // <--- C'est ici qu'on simplifie !

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KanbanOrchestrator();
    
    // 🛡️ On espionne la fonction DIRECTEMENT sur l'objet importé
    // Et on empêche son exécution réelle (mockResolvedValue)
    safeSyncSpy = vi.spyOn(OrchestratorEngine, 'safeSyncUniversalInteraction').mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Nettoyage impératif du spy après chaque test
    safeSyncSpy.mockRestore();
  });

  describe('updateTask', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'a pas la capacité de mettre à jour', async () => {
      await expect(
        orchestrator.updateTask('task-1', { status: 'DONE' }, restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit lever une erreur 404 si l\'atome est introuvable dans la Silice', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
      
      await expect(
        orchestrator.updateTask('inconnu', { status: 'DONE' }, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit mettre à jour l\'atome (par slug ou uid) et synchroniser Neo4j avec succès', async () => {
      const mockTask = { uid: 'task-uid-123', slug: 'atome-alpha', status: 'DONE' };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockTask as any);
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockTask),
      } as any);
      
      const res = await orchestrator.updateTask('atome-alpha', { status: 'DONE' }, adminSignature as any);
      
      expect(res.success).toBe(true);
      expect((res.mongo as any).uid).toBe('task-uid-123');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('reorderTasks', () => {
    it('🟢 doit réordonner les tâches via bulkWrite avec succès', async () => {
      vi.mocked(TaskModel.bulkWrite).mockResolvedValueOnce({} as any);
      const res = await orchestrator.reorderTasks(['t1', 't2'], adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
    });
  });

  describe('assignMember', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'a pas l\'Aura nécessaire', async () => {
      await expect(
        orchestrator.assignMember('task-1', 'target_bird', restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit assigner un membre à une tâche, lier le tout dans Neo4j et propager l\'interaction', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'task-1' } as any);

      const res = await orchestrator.assignMember('task-1', 'bird_target', adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Vérification du spy qu'on a déclaré avec vi.spyOn
      expect(safeSyncSpy).toHaveBeenCalledTimes(1);
      expect(safeSyncSpy).toHaveBeenCalledWith('bird_admin', 'bird_target', 'TASK', 'assignMember');
    });

    it('⚠️ ne doit pas propager l\'interaction universelle si on s\'assigne soi-même', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'task-1' } as any);

      const res = await orchestrator.assignMember('task-1', 'bird_admin', adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(safeSyncSpy).not.toHaveBeenCalled();
    });
  });
});
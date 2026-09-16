import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KanbanOrchestrator } from '../kanban.orchestrator';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';
import { syncUniversalInteraction } from '@ilot/infrastructure';

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
    syncUniversalInteraction: vi.fn(async () => true),
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

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KanbanOrchestrator();
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
      expect(res.mongo.uid).toBe('task-uid-123');
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

      // Vérification du tissage universel avec await
      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('bird_admin', 'bird_target', 'TASK');
    });

    it('⚠️ ne doit pas propager l\'interaction universelle si on s\'assigne soi-même', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'task-1' } as any);

      const res = await orchestrator.assignMember('task-1', 'bird_admin', adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(syncUniversalInteraction).not.toHaveBeenCalled();
    });
  });
});
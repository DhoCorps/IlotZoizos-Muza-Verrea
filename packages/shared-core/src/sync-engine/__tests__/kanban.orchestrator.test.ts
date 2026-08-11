// packages/shared-core/src/sync-engine/__tests__/kanban.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KanbanOrchestrator } from '../kanban.orchestrator';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
    bulkWrite: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => {
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
  const adminSignature = { uid: 'u1', role: 'architect', capabilities: [CAPABILITIES.TASK.UPDATE] };
  const restrictedSignature = { uid: 'u2', role: 'visitor', capabilities: [] };

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
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(
        orchestrator.updateTask('inconnu', { status: 'DONE' }, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit mettre à jour l\'atome (par slug ou uid) et synchroniser Neo4j avec succès', async () => {
      const mockTask = { uid: 'task-uid-123', slug: 'atome-alpha', status: 'DONE' };
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
    it('🟢 doit assigner un membre à une tâche et lier le tout dans le graphe Neo4j', async () => {
      vi.mocked(TaskModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce({ uid: 'task-1' }),
      } as any);

      const res = await orchestrator.assignMember('task-1', 'bird-1', adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(TaskModel.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
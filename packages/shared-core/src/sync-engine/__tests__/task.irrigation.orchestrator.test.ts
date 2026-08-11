// packages/shared-core/src/sync-engine/__test__/task.irrigation.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskIrrigationOrchestrator } from '../task.irrigation.orchestrator';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { 
      run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) 
    })),
  },
}));

describe('TaskIrrigationOrchestrator - Loi de l\'Irrigation (Sève)', () => {
  let orchestrator: TaskIrrigationOrchestrator;
  
  const adminSignature = { uid: 'u1', role: 'admin', capabilities: [CAPABILITIES.TASK.UPDATE] };
  const restrictedSignature = { uid: 'u2', role: 'visitor', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskIrrigationOrchestrator();
  });

  describe('processTaskIrrigation', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'a pas la capacité requise', async () => {
      await expect(
        orchestrator.processTaskIrrigation('task-1', restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit lever une erreur 404 si l\'atome/tâche est introuvable dans la Silice', async () => {
      vi.mocked(TaskModel.findOne).mockResolvedValueOnce(null);

      await expect(
        orchestrator.processTaskIrrigation('inconnu', adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit irriguer la tâche (résolue par uid ou slug), mettre à jour la Silice et synchroniser Neo4j avec succès', async () => {
      const mockTask = {
        uid: 'task-uid-1',
        slug: 'atome-slug',
        content: { title: 'Tâche Test' },
        status: 'PENDING',
        dependencies: []
      };

      vi.mocked(TaskModel.findOne).mockResolvedValueOnce(mockTask as any);
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockTask, status: 'ACTIVE', isIrrigated: 1 }),
      } as any);

      const res = await orchestrator.processTaskIrrigation('atome-slug', adminSignature as any);

      expect(res.success).toBe(true);
      expect(res.taskUid).toBe('task-uid-1');
      expect(TaskModel.findOne).toHaveBeenCalledWith({ $or: [{ slug: 'atome-slug' }, { uid: 'atome-slug' }] });
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
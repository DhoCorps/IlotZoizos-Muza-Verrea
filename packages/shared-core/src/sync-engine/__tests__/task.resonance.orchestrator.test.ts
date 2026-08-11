// packages/shared-core/src/sync-engine/__test__/task.resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskResonanceOrchestrator } from '../task.resonance.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    find: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { 
      run: vi.fn().mockResolvedValue({ records: [{ get: () => 'node_mock' }] }) 
    })),
  },
}));

describe('TaskResonanceOrchestrator - Résonance des Atomes (Phase 2)', () => {
  let orchestrator: TaskResonanceOrchestrator;
  
  const selfSignature = { actorUid: 'bird_1', capabilities: [] };
  const adminSignature = { actorUid: 'admin_bird', capabilities: ['*'] };
  const strangerSignature = { actorUid: 'bird_stranger', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskResonanceOrchestrator();
  });

  describe('calculateTaskResonance', () => {
    it('🟢 doit calculer correctement la résonance d\'une tâche', () => {
      const res = TaskResonanceOrchestrator.calculateTaskResonance({ estimatedTime: 2, realTime: 1, weight: 3 });
      expect(res).toBe(6); // (2 / 1) * 3 = 6
    });

    it('🟢 doit éviter la division par zéro si le temps réel est nul', () => {
      const res = TaskResonanceOrchestrator.calculateTaskResonance({ estimatedTime: 2, realTime: 0, weight: 2 });
      expect(res).toBe(40); // (2 / 0.1) * 2 = 40
    });
  });

  describe('processUserTaskResonance', () => {
    it('🔴 doit rejeter (404) si l\'Oiseau est introuvable', async () => {
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

      await expect(
        orchestrator.processUserTaskResonance('ghost', selfSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit rejeter (403) si l\'acteur n\'est ni l\'oiseau concerné ni admin', async () => {
      const mockUser = { uid: 'bird_1', slug: 'bird-1' };
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockUser as any);

      await expect(
        orchestrator.processUserTaskResonance('bird-1', strangerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit calculer et persister la résonance via canonicalUid avec succès', async () => {
      const mockUser = { uid: 'bird_1', slug: 'bird-1' };
      
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockUser as any);
      
      vi.mocked(TaskModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce([
          { pomodoros: { estimated: 2, completed: 1 }, metrics: { complexity: 2 } }
        ])
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockUser, metrics: { totalResonance: 4 } })
      } as any);

      const res = await orchestrator.processUserTaskResonance('bird-1', selfSignature as any);

      expect(res.success).toBe(true);
      expect(res.totalResonance).toBe(4);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
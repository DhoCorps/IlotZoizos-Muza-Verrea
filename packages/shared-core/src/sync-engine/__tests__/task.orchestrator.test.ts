// packages/shared-core/src/sync-engine/__tests__/task.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TaskModel, ProjectModel, OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', () => ({
  TaskModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
  },
  ProjectModel: {
    findOne: vi.fn(),
  },
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => [] }] }) })),
  },
}));

describe('TaskOrchestrator - Gestion des Atomes (Phase 2 & 3)', () => {
  let orchestrator: TaskOrchestrator;
  const adminSignature = { actorUid: 'architect_1', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_1', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskOrchestrator();

    // Simulation de la résolution canonique
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird_canonical_1' })
    } as any);
  });

  describe('fosterTask', () => {
    it('🔴 doit rejeter (404) si le chantier parent est introuvable', async () => {
      vi.mocked(ProjectModel.findOne).mockResolvedValueOnce(null);
      await expect(
        orchestrator.fosterTask({ projectUid: 'unknown' }, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit forger une tâche dans MongoDB et Neo4j via index stricts avec succès', async () => {
      const mockProject = { uid: 'proj_1', creatorUid: 'architect_1' };
      vi.mocked(ProjectModel.findOne).mockResolvedValueOnce(mockProject as any);
      vi.mocked(TaskModel.create).mockResolvedValueOnce([
        { toObject: () => ({ uid: 'task_1', title: 'Atome Test', status: 'TODO', assigneeUids: ['bird_1'] }) }
      ] as any);

      const res = await orchestrator.fosterTask(
        { projectUid: 'proj_1', title: 'Atome Test', assigneeUids: ['bird_1'] },
        adminSignature as any
      );

      expect(res.uid).toBe('task_1');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('completePomodoro', () => {
    it('🔴 doit rejeter (404) si l\'atome est introuvable', async () => {
      vi.mocked(TaskModel.findOne).mockResolvedValueOnce(null);
      await expect(
        orchestrator.completePomodoro('inconnu', userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit valider un cycle Pomodoro avec succès (avec résolution canonique)', async () => {
      const mockTask = { uid: 'task_1', slug: 'atome-1' };
      vi.mocked(TaskModel.findOne).mockResolvedValueOnce(mockTask as any);
             
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockTask, pomodoros: { completed: 1 } })
      } as any);

      const res = await orchestrator.completePomodoro('atome-1', userSignature as any);
      
      expect(res.pomodoros.completed).toBe(1);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1); // Résolution de l'auteur
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
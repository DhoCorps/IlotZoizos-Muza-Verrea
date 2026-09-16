import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '../task.orchestrator';
import { TaskModel, ProjectModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    TaskModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteMany: vi.fn(),
    },
    ProjectModel: {},
    OiseauModel: {},
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => [] }] }) })),
  },
}));

describe('TaskOrchestrator - Gestion des Atomes (Phase 2 & 3, Maillage)', () => {
  let orchestrator: TaskOrchestrator;
  const adminSignature = { actorUid: 'architect_1', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_1', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TaskOrchestrator(mockStorageManager);
    
    // Simulation de la résolution canonique via findEntityBySlugOrUid
    vi.mocked(findEntityBySlugOrUid).mockImplementation(async (model, identifier: any) => {
      if (model === ProjectModel || model === TaskModel) {
        return { uid: `resolved_${identifier}`, creatorUid: 'architect_1' } as any;
      }
      return { uid: `resolved_${identifier}` } as any;
    });
  });

  describe('fosterTask', () => {
    it('🚨 doit rejeter (404) si le chantier parent est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
      await expect(
        orchestrator.fosterTask({ projectUid: 'unknown' }, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🧱 doit forger une tâche dans MongoDB et Neo4j via index stricts avec succès (sans maillage transversal)', async () => {
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

    it('🕸️ doit forger une tâche ET lier un module transversal (ex: Partita) lors de la création', async () => {
      vi.mocked(TaskModel.create).mockImplementationOnce(async ([data]) => {
        return [{ toObject: () => ({ ...data, uid: 'task_transversal_1' }) }] as any;
      });

      const res = await orchestrator.fosterTask(
        { 
          projectUid: 'proj_2', 
          title: 'Mixage Audio',
          connections: { targetModule: 'PARTITA', targetEntityUid: 'partita_uid_88' }
        },
        adminSignature as any
      );

      expect(res.uid).toBe('task_transversal_1');
      expect((res as any).connections.targetModule).toBe('PARTITA');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTask', () => {
    it('🧬 doit mettre à jour un Atome et tisser un nouveau lien transversal si présent dans le payload', async () => {
      const mockTask = { uid: 'task_3', slug: 'atome-3' };
      
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockTask, status: 'DONE' })
      } as any);

      const updates = { 
        status: 'DONE', 
        connections: { targetModule: 'LETRIN', targetEntityUid: 'font_007' }
      };

      const res = await orchestrator.updateTask('atome-3', updates, adminSignature as any);
      
      expect(res.status).toBe('DONE');
      expect(TaskModel.findOneAndUpdate).toHaveBeenCalled();
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('completePomodoro', () => {
    it('🚨 doit rejeter (404) si l\'atome est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
      await expect(
        orchestrator.completePomodoro('inconnu', userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🍅 doit valider un cycle Pomodoro avec succès (avec résolution canonique)', async () => {
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'task_1', slug: 'atome-1', pomodoros: { completed: 1 } })
      } as any);

      const res = await orchestrator.completePomodoro('atome-1', userSignature as any);
      
      expect((res as any).pomodoros.completed).toBe(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
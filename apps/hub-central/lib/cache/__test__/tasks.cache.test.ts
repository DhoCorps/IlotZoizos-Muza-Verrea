// Fichier : __test__/cache/tasks.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedTasks, getCachedTaskDetails } from '@/lib/cache/tasks.cache';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  TaskModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

describe('Cache : Tasks Cache Helpers (Graphe + Silice)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedTasks', () => {
    it('doit hydrater les tâches depuis Neo4j et MongoDB avec leurs assignés', async () => {
      const mockNeo4jRecord = {
        get: vi.fn((key) => {
          if (key === 'taskUid') return 'task_1';
          if (key === 'assignees') return ['bird_1', 'bird_2'];
          return null;
        }),
      };

      const mockNeo4jSession = {
        run: vi.fn().mockResolvedValue({ records: [mockNeo4jRecord] }),
        close: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(getNeo4jSession).mockReturnValue(mockNeo4jSession as any);

      const mockTasks = [{ uid: 'task_1', title: 'Refactor Neo4j bug' }];
      vi.mocked(TaskModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTasks),
        }),
      } as any);

      const result = await getCachedTasks('bird_1', 'proj_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uid: 'task_1',
        title: 'Refactor Neo4j bug',
        assigneeUids: ['bird_1', 'bird_2'],
      });
      expect(mockNeo4jSession.run).toHaveBeenCalled();
      expect(mockNeo4jSession.close).toHaveBeenCalled();
      expect(TaskModel.find).toHaveBeenCalledWith({ uid: { $in: ['task_1'] } });
    });

    it('doit utiliser le fallback MongoDB si le Graphe Neo4j ne retourne aucune tâche', async () => {
      const mockNeo4jSession = {
        run: vi.fn().mockResolvedValue({ records: [] }),
        close: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(getNeo4jSession).mockReturnValue(mockNeo4jSession as any);

      const mockFallbackTasks = [{ uid: 'task_fallback', title: 'Fallback Task' }];
      vi.mocked(TaskModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockFallbackTasks),
        }),
      } as any);

      const result = await getCachedTasks('bird_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uid: 'task_fallback',
        title: 'Fallback Task',
        assigneeUids: [],
      });
      expect(TaskModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('getCachedTaskDetails', () => {
    it('doit récupérer les détails de la tâche ainsi que les capacités associées', async () => {
      const mockTask = { uid: 'task_1', title: 'Test Task' };
      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockTask),
      } as any);

      const mockGetCapabilities = vi.fn().mockResolvedValueOnce(['READ', 'WRITE']);

      const result = await getCachedTaskDetails('task_1', 'bird_1', mockGetCapabilities);

      expect(result).toEqual({
        task: mockTask,
        caps: ['READ', 'WRITE'],
      });
      expect(TaskModel.findOne).toHaveBeenCalledWith({ uid: 'task_1' });
      expect(mockGetCapabilities).toHaveBeenCalledWith('bird_1', 'task_1');
    });

    it('doit retourner null si la tâche n\'existe pas dans la Silice', async () => {
      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const mockGetCapabilities = vi.fn();

      const result = await getCachedTaskDetails('task_unknown', 'bird_1', mockGetCapabilities);

      expect(result).toBeNull();
      expect(mockGetCapabilities).not.toHaveBeenCalled();
    });
  });
});
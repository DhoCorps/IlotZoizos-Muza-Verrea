import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { OiseauModel, TeamModel, ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOneAndDelete: vi.fn().mockImplementation(() => ({
        lean: vi.fn().mockResolvedValue({})
      })),
    },
    TeamModel: { 
      find: vi.fn().mockImplementation(() => ({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([])
        })
      })),
      deleteMany: vi.fn() 
    },
    ProjectModel: { 
      find: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
        cursor: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] };
          }
        })
      })),
      deleteMany: vi.fn() 
    },
    TaskModel: { 
      find: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
        cursor: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] };
          }
        })
      })),
      deleteMany: vi.fn() 
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 1 }] }) })),
  },
}));

describe('OiseauOrchestrator - Souveraineté de l\'Oiseau (Phase 2)', () => {
  let orchestrator: OiseauOrchestrator;
  const selfSignature = { actorUid: 'bird_canonical_1', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator(mockStorageManager);

    vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
      const clean = identifier || 'unknown';
      return { uid: `resolved_${clean}` } as any;
    });

    vi.mocked(OiseauModel.findOneAndDelete).mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({})
    } as any));

    vi.mocked(TeamModel.find).mockImplementation(() => ({
      session: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      })
    } as any));

    vi.mocked(TaskModel.find).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
      cursor: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] };
        }
      })
    } as any));

    vi.mocked(ProjectModel.find).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
      cursor: vi.fn().mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] };
        }
      })
    } as any));
  });

  describe('fosterOiseau', () => {
    it('🟢 doit éclore un nouvel oiseau dans Mongo et Neo4j', async () => {
      vi.mocked(OiseauModel.create).mockResolvedValueOnce([{ uid: 'new_bird_uid', pseudo: 'Nouveau' }] as any);

      const res = await orchestrator.fosterOiseau({ email: 'test@ilot.com', pseudo: 'Nouveau', password: '123' });
      expect(res.success).toBe(true);
      expect(res.mongo.pseudo).toBe('Nouveau');
    });
  });

  describe('syncOiseau', () => {
    it('🔴 doit rejeter (403) si l\'acteur usurpe un autre profil', async () => {
      vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
        return { uid: identifier } as any;
      });

      await expect(
        orchestrator.syncOiseau({ uid: 'bird_victim', pseudo: 'Hack' }, { actorUid: 'bird_hacker', capabilities: [] })
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit synchroniser l\'oiseau directement par UID canonique via findEntityBySlugOrUid', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_1', pseudo: 'Modifié' })
      } as any);

      const res = await orchestrator.syncOiseau(
        { uid: 'bird_canonical_1', pseudo: 'Modifié' }, 
        selfSignature
      );

      expect(res.success).toBe(true);
      expect(res.mongo.pseudo).toBe('Modifié');
      expect(findEntityBySlugOrUid).toHaveBeenCalled();
    });
  });

  describe('exileOiseau', () => {
    it('🟢 doit exiler l\'oiseau et purger son stockage via des curseurs Mongoose sans saturer la RAM', async () => {
      const res = await orchestrator.exileOiseau('bird_canonical_1', selfSignature);

      expect(res.success).toBe(true);
      expect(TaskModel.find).toHaveBeenCalled();
      expect(ProjectModel.find).toHaveBeenCalled();
      expect(mockStorageManager.deleteFile).toHaveBeenCalled();
    });
  });
});
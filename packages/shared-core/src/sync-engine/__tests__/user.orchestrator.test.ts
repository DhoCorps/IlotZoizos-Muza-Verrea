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
      findOneAndDelete: vi.fn(),
    },
    TeamModel: { 
      find: vi.fn(), 
      deleteMany: vi.fn() 
    },
    ProjectModel: { 
      find: vi.fn(), 
      deleteMany: vi.fn() 
    },
    TaskModel: { 
      find: vi.fn(), 
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

    // Simulation dynamique pour la résolution canonique via findEntityBySlugOrUid
    vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
      const clean = identifier || 'unknown';
      return { uid: `resolved_${clean}` } as any;
    });
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
});
// Fichier : packages/shared-core/src/sync-engine/__tests__/user.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { OiseauModel, TeamModel, ProjectModel, TaskModel } from '@ilot/infrastructure';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
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
  };
});

// 🛡️ Mock direct de resolveCanonicalUid pour s'affranchir de la base de données dans les tests unitaires
vi.mock('../../utils/orchestrator.engine', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    resolveCanonicalUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 1 }] }) })),
  },
}));

describe('OiseauOrchestrator - Souveraineté de l\'Oiseau (Phase 2 & SSOT CV)', () => {
  let orchestrator: OiseauOrchestrator;
  const selfSignature = { actorUid: 'bird_canonical_1', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator(mockStorageManager);

    // Simulation du comportement de l'utilitaire global de résolution
    vi.mocked(orchestratorEngine.resolveCanonicalUid).mockImplementation(async (_model, identifier: any) => {
      if (!identifier) {
        throw new IlotError("Oiseau introuvable dans la Silice", "NOT_FOUND", 404);
      }
      return identifier;
    });

    vi.mocked(OiseauModel.findOneAndDelete).mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({})
    } as any));

    vi.mocked(TeamModel.find).mockImplementation(() => ({
      session: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      })
    } as any));

    // 🔗 Chaînage Mongoose fluide garanti pour TaskModel (.find().select().session().cursor())
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

    // 🔗 Chaînage Mongoose fluide garanti pour ProjectModel (.find().select().session().cursor())
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
      expect((res.mongo as any).pseudo).toBe('Nouveau');
    });
  });

  describe('syncOiseau (Incluant la synchronisation du Profil CV)', () => {
    it('🔴 doit rejeter (403) si l\'acteur usurpe un autre profil', async () => {
      vi.mocked(orchestratorEngine.resolveCanonicalUid).mockImplementation(async (_model, identifier: any) => {
        return identifier; // Retourne l'identifiant brut pour simuler l'écart entre l'acteur et la cible
      });

      await expect(
        orchestrator.syncOiseau({ uid: 'bird_victim', pseudo: 'Hack' }, { actorUid: 'bird_hacker', capabilities: [] })
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit synchroniser l\'oiseau directement par UID canonique via resolveCanonicalUid', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_1', pseudo: 'Modifié' })
      } as any);

      const res = await orchestrator.syncOiseau(
        { uid: 'bird_canonical_1', pseudo: 'Modifié' }, 
        selfSignature
      );

      expect(res.success).toBe(true);
      expect((res.mongo as any).pseudo).toBe('Modifié');
      expect(orchestratorEngine.resolveCanonicalUid).toHaveBeenCalled();
    });

    it('🟢 doit synchroniser le cvProfile (SSOT) vers MongoDB et les attributs RH clés vers Neo4j', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ 
          uid: 'bird_canonical_1', 
          cvProfile: { professionalStatus: 'FREELANCE', remotePreference: 'FULL_REMOTE', freelanceDailyRateCents: 50000 } 
        })
      } as any);

      const res = await orchestrator.syncOiseau(
        { 
          uid: 'bird_canonical_1', 
          cvProfile: { 
            professionalStatus: 'FREELANCE', 
            remotePreference: 'FULL_REMOTE', 
            freelanceDailyRateCents: 50000,
            catchphrase: "Prêt au combat" 
          } as any
        }, 
        selfSignature
      );

      expect(res.success).toBe(true);
      expect((res.mongo as any).cvProfile.professionalStatus).toBe('FREELANCE');
      expect((res.mongo as any).cvProfile.freelanceDailyRateCents).toBe(50000);
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
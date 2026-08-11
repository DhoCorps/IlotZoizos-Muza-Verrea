// packages/shared-core/src/sync-engine/__tests__/user.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { OiseauModel, TeamModel, ProjectModel, TaskModel } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
  TeamModel: { find: vi.fn(), deleteMany: vi.fn() },
  ProjectModel: { find: vi.fn(), deleteMany: vi.fn() },
  TaskModel: { find: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 1 }] }) })),
  },
}));

describe('OiseauOrchestrator - Souveraineté de l\'Oiseau (Phase 2)', () => {
  let orchestrator: OiseauOrchestrator;
  const selfSignature = { actorUid: 'bird_1', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator();

    // Simulation de la résolution canonique
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird_canonical_1', slug: 'bird-1' })
    } as any);
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
      // Simulation d'une tentative d'altération d'un autre utilisateur
      vi.mocked(OiseauModel.findOne)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_hacker' }) } as any)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_victim' }) } as any);

      await expect(
        orchestrator.syncOiseau({ uid: 'bird_victim', pseudo: 'Hack' }, { actorUid: 'bird_hacker', capabilities: [] })
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit synchroniser l\'oiseau après résolution canonique stricte', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_1', pseudo: 'Modifié' })
      } as any);

      const res = await orchestrator.syncOiseau(
        { uid: 'bird_1', pseudo: 'Modifié' }, 
        selfSignature
      );

      expect(res.success).toBe(true);
      expect(res.mongo.pseudo).toBe('Modifié');
    });
  });
});
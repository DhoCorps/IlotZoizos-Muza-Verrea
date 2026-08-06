// packages/shared-core/src/sync-engine/__tests__/user.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [] }) })),
  },
}));

describe('OiseauOrchestrator', () => {
  let orchestrator: OiseauOrchestrator;
  const selfSignature = { actorUid: 'bird_1', capabilities: [] };
  const adminSignature = { actorUid: 'admin_1', capabilities: ['*'] };
  const strangerSignature = { actorUid: 'bird_stranger', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator();
  });

  describe('fosterOiseau', () => {
    it('🟢 doit éclore un nouvel oiseau dans MongoDB et Neo4j avec succès', async () => {
      vi.mocked(OiseauModel.create).mockResolvedValueOnce([
        { uid: 'bird_new', email: 'test@ilot.net', pseudo: 'TestBird' }
      ] as any);

      const res = await orchestrator.fosterOiseau({
        email: 'test@ilot.net',
        pseudo: 'TestBird',
        password: 'securepassword'
      });

      expect(res.success).toBe(true);
      expect(res.mongo.uid).toBe('bird_new');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncOiseau', () => {
    it('🔴 doit rejeter (403) si l’acteur tente d’altérer l’essence d’un autre oiseau sans les droits root', async () => {
      await expect(
        orchestrator.syncOiseau({ uid: 'bird_1', pseudo: 'NewName' }, strangerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit synchroniser l’essence de l’oiseau avec succès si c’est lui-même', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_1', pseudo: 'NewName' })
      } as any);

      const res = await orchestrator.syncOiseau({ uid: 'bird_1', pseudo: 'NewName' }, selfSignature as any);

      expect(res.success).toBe(true);
      expect(res.mongo.pseudo).toBe('NewName');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('appliquerFluctuation', () => {
    it('🟢 doit appliquer une fluctuation d’entropie avec succès', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_1', entropieActive: 50 })
      } as any);

      const res = await orchestrator.appliquerFluctuation('bird_1', 50, selfSignature as any);

      expect(res.success).toBe(true);
      expect(res.mongo.entropieActive).toBe(50);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OiseauOrchestrator } from '../user.orchestrator';
import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 1. Mock direct et robuste
vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
  TeamModel: vi.fn(),
  ProjectModel: vi.fn(),
  TaskModel: vi.fn(),
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [] }) })),
  },
}));

describe('OiseauOrchestrator', () => {
  let orchestrator: OiseauOrchestrator;
  const selfSignature = { actorUid: 'bird_1', capabilities: [] };
  const strangerSignature = { actorUid: 'bird_stranger', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new OiseauOrchestrator();
  });

  describe('fosterOiseau', () => {
    it('🟢 doit éclore un nouvel oiseau dans MongoDB et Neo4j avec succès', async () => {
      // On mock .create pour qu'il renvoie un tableau contenant notre oiseau
      vi.mocked(OiseauModel.create).mockResolvedValue([
        { uid: 'bird_new', email: 'test@ilot.net', pseudo: 'TestBird' }
      ] as any);

      const res = await orchestrator.fosterOiseau({
        email: 'test@ilot.net',
        pseudo: 'TestBird',
        password: 'securepassword'
      });

      expect(res.success).toBe(true);
      expect(res.mongo.uid).toBe('bird_new');
      expect(TransactionManager.execute).toHaveBeenCalled();
    });
  });

  describe('syncOiseau', () => {
    it('🔴 doit rejeter (403) si l’acteur tente d’altérer l’essence d’un autre oiseau sans les droits root', async () => {
      await expect(
        orchestrator.syncOiseau({ uid: 'bird_1', pseudo: 'NewName' }, strangerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit synchroniser l’essence de l’oiseau avec succès si c’est lui-même', async () => {
      // Mock de la chaîne .findOneAndUpdate().lean()
      const mockChain = {
        lean: vi.fn().mockResolvedValue({ uid: 'bird_1', pseudo: 'NewName' })
      };
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue(mockChain as any);

      const res = await orchestrator.syncOiseau({ uid: 'bird_1', pseudo: 'NewName' }, selfSignature as any);

      expect(res.success).toBe(true);
      expect(res.mongo.pseudo).toBe('NewName');
    });
  });

  describe('appliquerFluctuation', () => {
    it('🟢 doit appliquer une fluctuation d’entropie avec succès', async () => {
      // Mock de la chaîne .findOneAndUpdate().lean()
      const mockChain = {
        lean: vi.fn().mockResolvedValue({ uid: 'bird_1', entropieActive: 50 })
      };
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue(mockChain as any);

      const res = await orchestrator.appliquerFluctuation('bird_1', 50, selfSignature as any);

      expect(res.success).toBe(true);
      expect(res.mongo.entropieActive).toBe(50);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceOrchestrator } from '../ecommerce.orchestrator';
import { TransactionManager } from '../transactionManager';
import { syncUniversalInteraction, RouletteModel } from '@ilot/infrastructure';

// 1. Mock de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    syncUniversalInteraction: vi.fn(async () => true),
    SystemGraphDlqModel: { create: vi.fn().mockResolvedValue([{}]) },
    ProductModel: { deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }) },
    StoreModel: { deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }) },
    RouletteModel: {}
  };
});

// 2. Mock du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ 
          records: [{ 
            get: (field: string) => {
              if (field === 'ownerUid') return 'store_owner_123';
              if (field === 'initiatorUid') return 'initiator_123';
              if (field === 'balance') return 100;
              if (field === 'wagerAmount') return 10;
              if (field === 'basePrice') return 5000;
              if (field === 'distance') return 2;
              return 'mock_node';
            }
          }] 
        })
      };
      return await cb(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('EcommerceOrchestrator - Core v1 (Boutiques, Tags, Karma, Troc & Roulette)', () => {
  let orchestrator: EcommerceOrchestrator;
  const mockActorUid = 'bird-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new EcommerceOrchestrator();

    const mockNullQuery = Promise.resolve(null) as any;
    mockNullQuery.session = vi.fn().mockResolvedValue(null);

    RouletteModel.findOne = vi.fn().mockReturnValue(mockNullQuery) as any;
    RouletteModel.insertMany = vi.fn().mockResolvedValue([{ uid: 'roulette_sess_123' }]) as any;
  });

  describe('createProduct (avec Tags)', () => {
    it('🟢 doit créer un artefact et synchroniser ses tags dans le Graphe', async () => {
      const result = await orchestrator.createProduct(
        { uid: 'prod-1', storeUid: 'store-1', title: 'Epée Plasma', priceCents: 1500, tags: ['arme', 'plasma'] },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('spinKarmicRoulette', () => {
    it('🟢 doit déduire la mise, générer un prix réduit et verrouiller la session pour 24h', async () => {
      const result = await orchestrator.spinKarmicRoulette(
        mockActorUid, 'prod-1', { actorUid: mockActorUid, capabilities: ['*'] }
      );
      expect(result.success).toBe(true);
      expect(result.price).toBeLessThan(5000); 
    });
  });

  // 👇 NOUVEAUX TESTS POUR LE TROC
  describe('Gestion du Troc (Barter)', () => {
    it('🟢 doit créer un noeud Barter dans Neo4j via proposeBarter', async () => {
      const result = await orchestrator.proposeBarter(
        { uid: 'barter_1', initiatorUid: mockActorUid, offeredUids: ['p1'], requestedUids: ['p2'] },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit mettre à jour le noeud Barter dans Neo4j via resolveBarter', async () => {
      const result = await orchestrator.resolveBarter(
        { barterUid: 'barter_1', acceptorUid: 'bird_beta', status: 'ACCEPTED' },
        { actorUid: 'bird_beta', capabilities: ['*'] }
      );
      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
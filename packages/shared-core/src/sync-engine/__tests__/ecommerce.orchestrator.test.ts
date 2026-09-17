import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceOrchestrator } from '../ecommerce.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    syncUniversalInteraction: vi.fn(async () => true),
    SystemGraphDlqModel: {
      create: vi.fn().mockResolvedValue([{}])
    }
  };
});

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
              return 'mock_node';
            }
          }] 
        })
      };
      return await cb(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('EcommerceOrchestrator - Synchronisation Boutique, Commandes & Troc', () => {
  let orchestrator: EcommerceOrchestrator;
  const mockActorUid = 'bird-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new EcommerceOrchestrator();
  });

  describe('createStore', () => {
    it('🔴 doit rejeter (401) si l\'Oiseau n\'est pas authentifié', async () => {
      await expect(
        orchestrator.createStore(
          { uid: 'store-1', ownerUid: mockActorUid, storeName: 'Boutique', slug: 'boutique' },
          { actorUid: '', capabilities: [] }
        )
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit créer une boutique et lier l\'Oiseau dans le graphe via MATCH strict', async () => {
      const result = await orchestrator.createStore(
        { uid: 'store-1', ownerUid: mockActorUid, storeName: 'Boutique des Artefacts', slug: 'boutique-des-artefacts' },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      
      expect(result.success).toBe(true);
      expect(result.storeUid).toBe('store-1');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit rejeter (404) si l\'Oiseau est introuvable dans le Graphe (zéro record)', async () => {
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as any, { run: vi.fn().mockResolvedValue({ records: [] }) } as any);
      });

      await expect(
        orchestrator.createStore(
          { uid: 'store-1', ownerUid: mockActorUid, storeName: 'Boutique', slug: 'boutique' },
          { actorUid: mockActorUid, capabilities: ['*'] }
        )
      ).rejects.toThrow(/Oiseau propriétaire introuvable/);
    });
  });

  describe('recordOrder', () => {
    it('🟢 doit enregistrer une commande, relier l\'acheteur et propager l\'interaction universelle', async () => {
      const result = await orchestrator.recordOrder(
        { uid: 'ord-1', buyerUid: mockActorUid, storeUid: 'store-1', totalAmountCents: 1500, stripePaymentIntentId: 'pi_123' },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      
      expect(result.success).toBe(true);
      expect(result.orderUid).toBe('ord-1');

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith(mockActorUid, 'store_owner_123', 'ECOMMERCE');
    });

    it('🟡 doit basculer l\'interaction en DLQ si syncUniversalInteraction échoue', async () => {
      vi.mocked(syncUniversalInteraction).mockRejectedValueOnce(new Error('Neo4j timeout'));

      const result = await orchestrator.recordOrder(
        { uid: 'ord-1', buyerUid: mockActorUid, storeUid: 'store-1', totalAmountCents: 1500, stripePaymentIntentId: 'pi_123' },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );

      expect(result.success).toBe(true);
      expect(SystemGraphDlqModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('proposeBarter & resolveBarter', () => {
    it('🟢 doit enregistrer une proposition de troc et propager l\'interaction si une cible est désignée', async () => {
      const result = await orchestrator.proposeBarter(
        { uid: 'barter-1', initiatorUid: mockActorUid, receiverUid: 'bird-beta', offeredUids: ['prod-1'], requestedUids: ['prod-2'] },
        { actorUid: mockActorUid, capabilities: ['*'] }
      );
      
      expect(result.success).toBe(true);
      expect(result.barterUid).toBe('barter-1');

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith(mockActorUid, 'bird-beta', 'ECOMMERCE');
    });

    it('🟢 doit résoudre (accepter) une offre de troc, lier les oiseaux et propager l\'interaction', async () => {
      const result = await orchestrator.resolveBarter(
        { barterUid: 'barter-1', acceptorUid: 'bird-beta', status: 'ACCEPTED' },
        { actorUid: 'bird-beta', capabilities: ['*'] }
      );
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('ACCEPTED');

      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('initiator_123', 'bird-beta', 'ECOMMERCE');
    });
  });
});
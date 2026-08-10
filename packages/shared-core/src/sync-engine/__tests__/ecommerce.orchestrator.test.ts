import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceOrchestrator } from '../ecommerce.orchestrator';
import { TransactionManager } from '../transactionManager';

// On arrête de mocker mongoose globalement, on laisse l'infrastructure réelle charger ses modèles.
// On ne mock que le gestionnaire de transactions qui fait le pont avec Neo4j/Mongo.

describe('EcommerceOrchestrator - Synchronisation Boutique, Commandes & Troc', () => {
  let orchestrator: EcommerceOrchestrator;
  const mockActorUid = 'bird-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new EcommerceOrchestrator();

    // 🛡️ Espionnage direct de la méthode statique : 
    // On simule l'exécution de la transaction sans toucher à Mongoose globalement.
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (_name, callback) => {
      // On injecte un mock de session et de transaction Neo4j
      const mockMongoSession = {} as any;
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx as any);
    });
  });

  it('🟢 doit créer une boutique et lier l\'Oiseau dans le graphe', async () => {
    const result = await orchestrator.createStore(
      { uid: 'store-1', ownerUid: mockActorUid, storeName: 'Boutique des Artefacts', slug: 'boutique-des-artefacts' },
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
    expect(result.storeUid).toBe('store-1');
  });

  it('🟢 doit enregistrer une commande et relier acheteur et boutique', async () => {
    const result = await orchestrator.recordOrder(
      { uid: 'ord-1', buyerUid: mockActorUid, storeUid: 'store-1', totalAmountCents: 1500, stripePaymentIntentId: 'pi_123' },
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
    expect(result.orderUid).toBe('ord-1');
  });

  it('🟢 doit enregistrer une proposition de troc entre oiseaux', async () => {
    const result = await orchestrator.proposeBarter(
      { uid: 'barter-1', initiatorUid: mockActorUid, receiverUid: 'bird-beta', offeredUids: ['prod-1'], requestedUids: ['prod-2'] },
      { actorUid: mockActorUid, capabilities: ['*'], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
    expect(result.barterUid).toBe('barter-1');
  });

  it('🟢 doit résoudre (accepter) une offre de troc', async () => {
    const result = await orchestrator.resolveBarter(
      { barterUid: 'barter-1', acceptorUid: 'bird-beta', status: 'ACCEPTED' },
      { actorUid: 'bird-beta', capabilities: ['*'], issuedAt: new Date() }
    );
    expect(result.success).toBe(true);
    expect(result.status).toBe('ACCEPTED');
  });

  it('🔴 doit rejeter la création de boutique si l\'Oiseau n\'est pas authentifié (401)', async () => {
    await expect(
      orchestrator.createStore(
        { uid: 'store-1', ownerUid: '', storeName: 'Test', slug: 'test' },
        { actorUid: '', capabilities: [], issuedAt: new Date() }
      )
    ).rejects.toThrow();
  });
});
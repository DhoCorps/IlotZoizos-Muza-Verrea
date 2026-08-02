import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceOrchestrator } from '../ecommerce.orchestrator';

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}));

vi.mock('../../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback({} as any, mockNeo4jTx as any);
    })
  }
}));

describe('EcommerceOrchestrator - Synchronisation Boutique, Commandes & Troc', () => {
  let orchestrator: EcommerceOrchestrator;
  const mockActorUid = 'bird-alpha';

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new EcommerceOrchestrator();
  });

  it('🟢 doit créer une boutique et lier l\'Oiseau dans le graphe', async () => {
    const result = await orchestrator.createStore(
      { uid: 'store-1', ownerUid: mockActorUid, storeName: 'Boutique des Artefacts', slug: 'boutique-des-artefacts' }, // 🪡 Le slug est là
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
        { uid: 'store-1', ownerUid: '', storeName: 'Test', slug: 'test' }, // 🪡 Slug ajouté ici aussi
        { actorUid: '', capabilities: [], issuedAt: new Date() }
      )
    ).rejects.toThrow();
  });
});
// packages/shared-core/src/sync-engine/__test__/market.regulation.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketRegulationOrchestrator, MarketEntityContext, MarketContractPayload } from '../market.regulation.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) })),
  },
}));

describe('MarketRegulationOrchestrator - Régulation & Contrats (Prêt, Don, Troc)', () => {
  let orchestrator: MarketRegulationOrchestrator;
  const dummySignature = { actorUid: 'bird_initiator', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new MarketRegulationOrchestrator();

    // Simulation du résolveur MongoDB
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockImplementation(async () => ({ uid: 'resolved_uid_123', exchanges: [] }))
    } as any);
  });

  describe('evaluateMarketAccess', () => {
    it('🟢 doit autoriser l\'accès sous latence si l\'Oiseau est en déficit', () => {
      const context: MarketEntityContext = {
        uid: 'bird_taker',
        exchanges: [{ type: 'TAKE', value: 50 }, { type: 'GIFT', value: 10 }], 
        currentNeeds: 5,
        creationFactor: 1.0
      };
      const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 1.0);
      expect(result.isAuthorized).toBe(true);
      expect(result.vitalBalance).toBe(-40);
      expect(result.latencyMs).toBeGreaterThan(0);
    });
  });

  describe('processConnectedRegulation', () => {
    it('🟢 doit évaluer, persister dans la Silice et propager dans Neo4j par canonicalUid', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'resolved_uid_123', marketRegulationState: { isAuthorized: true } }),
      } as any);

      const res = await orchestrator.processConnectedRegulation(
        'oiseau-slug', 5, 1.0, 1.0, dummySignature as any
      );

      expect(res.success).toBe(true);
      expect(res.targetUid).toBe('resolved_uid_123'); // Vérifie l'éradication du OR slug
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('proposeMarketContract (Don, Troc, Prêt)', () => {
    it('🔴 doit rejeter (403) si un oiseau tente de forger un contrat au nom d\'un autre', async () => {
      const payload: MarketContractPayload = {
        contractUid: 'ctr_1', initiatorUid: 'hacker_bird', targetUid: 'target_bird',
        contractType: 'LOAN', virtualValueAmount: 1000, currency: 'TOTAMTOE', interestRate: 5
      };
      await expect(orchestrator.proposeMarketContract(payload, dummySignature as any)).rejects.toThrow(IlotError);
    });

    it('🟢 doit forger un contrat de PRÊT (LOAN) avec intérêt et durée', async () => {
      const payload: MarketContractPayload = {
        contractUid: 'ctr_loan_1', initiatorUid: 'bird_initiator', targetUid: 'target_bird',
        contractType: 'LOAN', virtualValueAmount: 500, currency: 'ESSENCE_VENT',
        interestRate: 4.5, durationDays: 30, description: 'Prêt pour création de guilde'
      };

      const res = await orchestrator.proposeMarketContract(payload, dummySignature as any);

      expect(res.success).toBe(true);
      expect(res.contractUid).toBe('ctr_loan_1');
      // Vérifie que les deux UIDs ont été résolus canoniquement avant la transaction
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit forger un contrat de DON (GIFT) sans intérêt', async () => {
      const payload: MarketContractPayload = {
        contractUid: 'ctr_gift_1', initiatorUid: 'bird_initiator', targetUid: 'target_bird',
        contractType: 'GIFT', virtualValueAmount: 100, currency: 'KAOS_ORGANIQUE',
        description: 'Soutien aux créateurs'
      };

      const res = await orchestrator.proposeMarketContract(payload, dummySignature as any);

      expect(res.success).toBe(true);
      expect(res.contractUid).toBe('ctr_gift_1');
    });
  });
});
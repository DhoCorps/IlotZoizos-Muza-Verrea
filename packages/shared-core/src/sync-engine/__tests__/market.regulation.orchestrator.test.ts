// packages/shared-core/src/sync-engine/__test__/market.regulation.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketRegulationOrchestrator, MarketEntityContext } from '../market.regulation.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { IlotError } from '../../errors/ilot.errors';

// 1. Mock de la Silice (MongoDB)
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

describe('MarketRegulationOrchestrator', () => {
  let orchestrator: MarketRegulationOrchestrator;
  const dummySignature = { actorUid: 'bird_admin', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new MarketRegulationOrchestrator();
  });

  describe('evaluateMarketAccess (Règles d’échange)', () => {
    it('🟢 doit autoriser l’accès sous latence si l’Oiseau est en déficit énergétique (Lambda < 0)', () => {
      const context: MarketEntityContext = {
        uid: 'bird_taker',
        exchanges: [
          { type: 'TAKE', value: 50 },
          { type: 'GIFT', value: 10 }
        ], // Balance vitale = 10 - 50 = -40 (Déficit)
        currentNeeds: 5,
        creationFactor: 1.0
      };

      const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 1.0);

      expect(result.isAuthorized).toBe(true);
      expect(result.vitalBalance).toBe(-40);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.message).toContain("déficit énergétique");
    });

    it('🔴 doit rejeter l’accès si l’échange est stérile (aucune contribution de dons)', () => {
      const context: MarketEntityContext = {
        uid: 'bird_sterile',
        exchanges: [
          { type: 'TAKE', value: 20 }
        ], // 0 cadeaux, que des prises -> Juste Prise stérile
        currentNeeds: 10,
        creationFactor: 0.1
      };

      const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 1.0);

      expect(result.isAuthorized).toBe(false);
      expect(result.vitalBalance).toBe(-20);
      expect(result.latencyMs).toBe(0);
      expect(result.message).toContain("Prise rejetée");
    });

    it('🟢 doit autoriser l’accès sans latence si l’échange est équilibré ou en excédent (Lambda >= 0)', () => {
      const context: MarketEntityContext = {
        uid: 'bird_giver',
        exchanges: [
          { type: 'GIFT', value: 40 },
          { type: 'TAKE', value: 10 }
        ], // Balance vitale = 40 - 10 = +30 (Excédent)
        currentNeeds: 5,
        creationFactor: 1.5
      };

      const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 1.0);

      expect(result.isAuthorized).toBe(true);
      expect(result.vitalBalance).toBe(30);
      expect(result.latencyMs).toBe(0);
      expect(result.message).toContain("Échange équilibré");
    });
  });

  describe('processConnectedRegulation (Flux connecté et persistance)', () => {
    it('🔴 doit lever une erreur 404 si l’Oiseau est introuvable dans la Silice', async () => {
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

      await expect(
        orchestrator.processConnectedRegulation('oiseau-fantome', 5, 1.0, 1.0, dummySignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit évaluer, persister dans la Silice et retourner l’état de régulation avec succès', async () => {
      const mockUser = {
        uid: 'bird_uuid_123',
        slug: 'oiseau-equilibriste',
        pseudo: 'Equilibriste',
        exchanges: [
          { type: 'GIFT', value: 25 },
          { type: 'TAKE', value: 5 }
        ]
      };

      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockUser as any);
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockUser, marketRegulationState: { isAuthorized: true } }),
      } as any);

      const res = await orchestrator.processConnectedRegulation(
        'oiseau-equilibriste', 
        5, 
        1.0, 
        1.0, 
        dummySignature as any
      );

      expect(res.success).toBe(true);
      expect(res.targetUid).toBe('bird_uuid_123');
      expect(res.targetSlug).toBe('oiseau-equilibriste');
      expect(res.vitalBalance).toBe(20);
      expect(res.isAuthorized).toBe(true);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
// packages/shared-core/src/sync-engine/__tests__/paymentTokenization.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentTokenizationOrchestrator, TokenizePaymentPayload } from '../paymentTokenisation.orchestrator';
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
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_uid' }] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PaymentTokenizationOrchestrator - Sécurité Financière', () => {
  let orchestrator: PaymentTokenizationOrchestrator;
  
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };
  const hackerSignature = { actorUid: 'bird_hacker', capabilities: [] };
  const adminSignature = { actorUid: 'architect_root', capabilities: ['*'] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PaymentTokenizationOrchestrator();
  });

  describe('linkExternalPaymentProfile', () => {
    it('🔴 doit rejeter (403) si l\'acteur tente d\'injecter des tokens pour un autre oiseau', async () => {
      const payload: TokenizePaymentPayload = {
        userUid: 'bird_alpha',
        externalCustomerId: 'cus_stripe_123',
        defaultPaymentMethodId: 'pm_card_456',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload, hackerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit rejeter (400) si le payload est corrompu ou incomplet', async () => {
      const payload = {
        userUid: 'bird_alpha',
        externalCustomerId: '', // Token manquant
        defaultPaymentMethodId: 'pm_card_456',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload as any, validSignature as any)
      ).rejects.toThrow(/Tokens de paiement manquants/);
    });

    it('🔴 doit rejeter (404) si l\'oiseau est introuvable lors de la résolution canonique', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_ghost',
        externalCustomerId: 'cus_stripe_123',
        defaultPaymentMethodId: 'pm_card_456',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload, { actorUid: 'bird_ghost', capabilities: [] } as any)
      ).rejects.toThrow(/Oiseau introuvable/);
    });

    it('🟢 doit lier avec succès les tokens externes pour soi-même après résolution canonique', async () => {
      const mockUser = { uid: 'bird_canonical_alpha' };
      
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          ...mockUser,
          paymentProfile: { hasActiveWallet: true },
        }),
      } as any);

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_alpha', // L'acteur agit sur lui-même
        externalCustomerId: 'cus_stripe_abc789',
        defaultPaymentMethodId: 'pm_card_xyz987',
      };

      const result = await orchestrator.linkExternalPaymentProfile(payload, validSignature as any);

      expect(result.success).toBe(true);
      expect(result.userUid).toBe('bird_canonical_alpha'); // L'UID a bien été résolu et traduit
      expect(result.hasActiveWallet).toBe(true);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit lever une erreur interne (500) si la synchronisation Neo4j échoue (nœud introuvable)', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_alpha' }),
      } as any);

      // On simule également le findOneAndUpdate pour éviter l'erreur TypeError reading 'lean'
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_alpha' }),
      } as any);

      // Simulation d'une rupture Neo4j : L'oiseau existe dans Mongo mais pas dans le Graphe
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, { run: vi.fn().mockResolvedValue({ records: [] }) } as any);
      });

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_alpha',
        externalCustomerId: 'cus_stripe_abc789',
        defaultPaymentMethodId: 'pm_card_xyz987',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload, validSignature as any)
      ).rejects.toThrow(/Oiseau introuvable dans le Graphe/);
    });
  });
});
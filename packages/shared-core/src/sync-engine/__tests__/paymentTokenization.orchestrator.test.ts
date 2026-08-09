// packages/shared-core/src/sync-engine/__tests__/payment.tokenization.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentTokenizationOrchestrator, TokenizePaymentPayload } from '../paymentTokenisation.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 1. Mock de la Silice (MongoDB / OiseauModel) avec support du chaînage .session() et .lean()
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

// 2. Mock du TransactionManager pour simuler l'atomicité Silice + Graphe Neo4j
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'user_123' }] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PaymentTokenizationOrchestrator - Tokenisation Externe des Paiements', () => {
  let orchestrator: PaymentTokenizationOrchestrator;
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };
  const hackerSignature = { actorUid: 'bird_hacker', capabilities: [] };
  const adminSignature = { actorUid: 'architect_root', capabilities: ['*'] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PaymentTokenizationOrchestrator();
  });

  describe('linkExternalPaymentProfile', () => {
    it('doit rejeter (403) si l\'acteur tente de lier des informations de paiement pour un autre oiseau sans les droits root', async () => {
      const payload: TokenizePaymentPayload = {
        userUid: 'bird_alpha',
        externalCustomerId: 'cus_test_123',
        defaultPaymentMethodId: 'pm_test_456',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload, hackerSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('doit lever une erreur 404 si l\'oiseau est introuvable dans la Silice', async () => {
      // Simulation d'un oiseau absent en base
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_inconnu',
        externalCustomerId: 'cus_test_123',
        defaultPaymentMethodId: 'pm_test_456',
      };

      await expect(
        orchestrator.linkExternalPaymentProfile(payload, validSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('doit lier avec succès les tokens externes pour soi-même et mettre à jour la matrice', async () => {
      const mockUser = {
        uid: 'bird_alpha',
        slug: 'bird-alpha',
      };

      // Simulation de la recherche de l'oiseau et de sa mise à jour chaînée .lean()
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          ...mockUser,
          paymentProfile: { hasActiveWallet: true },
        }),
      } as any);

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_alpha',
        externalCustomerId: 'cus_stripe_abc789',
        defaultPaymentMethodId: 'pm_card_xyz987',
      };

      const result = await orchestrator.linkExternalPaymentProfile(payload, validSignature as any);

      expect(result.success).toBe(true);
      expect(result.userUid).toBe('bird_alpha');
      expect(result.hasActiveWallet).toBe(true);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('doit permettre à un Administrateur (*) de lier un profil de paiement pour un autre oiseau', async () => {
      const mockUser = {
        uid: 'bird_beta',
        slug: 'bird-beta',
      };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          ...mockUser,
          paymentProfile: { hasActiveWallet: true },
        }),
      } as any);

      const payload: TokenizePaymentPayload = {
        userUid: 'bird_beta',
        externalCustomerId: 'cus_stripe_admin_link',
        defaultPaymentMethodId: 'pm_card_admin_link',
      };

      const result = await orchestrator.linkExternalPaymentProfile(payload, adminSignature as any);

      expect(result.success).toBe(true);
      expect(result.userUid).toBe('bird_beta');
    });
  });
});
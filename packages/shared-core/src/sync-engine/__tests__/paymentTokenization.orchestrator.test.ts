import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentTokenizationOrchestrator, TokenizePaymentPayload } from '../paymentTokenisation.orchestrator';
import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ 1. Mock synchrone pur de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOneAndUpdate: vi.fn(),
  },
  findEntityBySlugOrUid: vi.fn(),
}));

// 🛡️ 2. Mock direct du moteur d'orchestration pour neutraliser les appels imbriqués
vi.mock('../../utils/orchestrator.engine', () => ({
  resolveCanonicalUid: vi.fn(),
  safeSyncUniversalInteraction: vi.fn(async () => {})
}));

// 🛡️ 3. Mock de la transaction Neo4j/Mongo
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

describe('PaymentTokenizationOrchestrator - Sécurité Financière', () => {
  let orchestrator: PaymentTokenizationOrchestrator;
  
  const validSignature = { actorUid: 'bird_alpha', capabilities: [] };
  const hackerSignature = { actorUid: 'bird_hacker', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PaymentTokenizationOrchestrator();

    // 🔍 Résolution canonique via mock (contourne totalement findEntityBySlugOrUid)
    vi.mocked(orchestratorEngine.resolveCanonicalUid).mockImplementation(async (_model, identifier) => {
      if (identifier === 'bird_ghost') {
        throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
      }
      return 'bird_canonical_alpha'; // Résolution de succès par défaut
    });

    // ⚙️ Transaction par défaut réussie
    vi.mocked(TransactionManager.execute).mockImplementation(async (_name, cb) => {
      return await cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_uid' }] }) } as unknown as Transaction);
    });
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
      // ✅ Configuration stricte du chaînage Mongoose pour ce test précis
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          uid: 'bird_canonical_alpha',
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
      expect(result.userUid).toBe('bird_canonical_alpha'); // Validation du mock de resolveCanonicalUid
      expect(result.hasActiveWallet).toBe(true);
      expect(orchestratorEngine.resolveCanonicalUid).toHaveBeenCalledTimes(1);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit lever une erreur interne (500) si la synchronisation Neo4j échoue (nœud introuvable)', async () => {
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'bird_canonical_alpha' }),
      } as any);

      // Simulation d'une rupture Neo4j : L'oiseau existe dans Mongo mais pas dans le Graphe
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, cb) => {
        return await cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [] }) } as unknown as Transaction);
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
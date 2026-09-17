import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator } from '../komptaPayment.orchestrator';
import { TransactionManager } from '../transactionManager';
import { WalletModel, KomptaLedgerService } from '@ilot/infrastructure';
import * as orchestratorEngine from '../../utils/orchestrator.engine';

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'tx_123' }] })
      };
      return callback(mockMongoSession, mockNeo4jTx);
    })
  }
}));

// Mock de l'utilitaire global safeSyncUniversalInteraction
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {})
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    WalletModel: {
      findOne: vi.fn()
    },
    KomptaLedgerService: {
      recordEntry: vi.fn()
    }
  };
});

describe('KomptaPaymentOrchestrator - Le Gardien du Trésor', () => {
  let orchestrator: KomptaPaymentOrchestrator;
  const validSignature = { actorUid: 'bird_investor_1', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KomptaPaymentOrchestrator();

    vi.mocked(WalletModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({
        balance: 10000, 
        currency: 'EUR',
        save: vi.fn().mockResolvedValue(true)
      })
    } as never);

    vi.mocked(KomptaLedgerService.recordEntry).mockResolvedValue(true as never);
  });

  describe('Transferts et Transactions', () => {
    it('🟢 doit enregistrer un transfert direct et propager l\'interaction universelle de manière synchrone (await)', async () => {
      const payload = {
        transferUid: 'tx_1',
        senderUid: 'bird_investor_1',
        recipientUid: 'bird_receiver_1',
        amountCents: 500,
        currency: 'EUR'
      };

      const result = await orchestrator.executeDirectTransfer(payload, validSignature as never);
      
      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith('bird_investor_1', 'bird_receiver_1', 'ECOMMERCE', 'executeDirectTransfer');
    });

    it('🟡 doit déléguer la gestion d\'échec à l\'utilitaire global safeSyncUniversalInteraction sur executeDirectTransfer', async () => {
      const payload = {
        transferUid: 'tx_1',
        senderUid: 'bird_investor_1',
        recipientUid: 'bird_receiver_1',
        amountCents: 500,
        currency: 'EUR'
      };

      const result = await orchestrator.executeDirectTransfer(payload, validSignature as never);
      
      expect(result.success).toBe(true);
      // L'appel sécurisé encapsule la gestion d'erreur et DLQ en interne
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Webhook & Dépôts Externes', () => {
    it('🔴 doit rejeter le dépôt si le destinataire est introuvable', async () => {
      const payload = {
        id: 'evt_123',
        amount: 5000,
        currency: 'eur'
      };
      await expect(orchestrator.processExternalPayment(payload)).rejects.toThrow(
        "Impossible de déterminer l'oiseau destinataire des fonds externes."
      );
    });

    it('🔴 doit rejeter le dépôt si le montant est <= 0', async () => {
      const payload = {
        id: 'evt_123',
        amount: 0,
        currency: 'eur',
        customer: 'cus_bird123'
      };
      await expect(orchestrator.processExternalPayment(payload)).rejects.toThrow(
        "Le montant du dépôt externe en centimes doit être un entier strict et positif."
      );
    });

    it('🟢 doit traiter un dépôt externe valide via webhook et retourner un succès', async () => {
      const payload = {
        id: 'evt_stripe_456',
        amount: 10000,
        currency: 'eur',
        metadata: {
          recipientUid: 'bird_investor_1'
        }
      };
      const result = await orchestrator.processExternalPayment(payload);
      
      expect(result.success).toBe(true);
      expect(result.depositUid).toBe('evt_stripe_456');
      expect(TransactionManager.execute).toHaveBeenCalled();
      
      expect(WalletModel.findOne).toHaveBeenCalledWith({ userId: 'bird_investor_1' });
      expect(orchestratorEngine.safeSyncUniversalInteraction).not.toHaveBeenCalled();
    });
  });
});
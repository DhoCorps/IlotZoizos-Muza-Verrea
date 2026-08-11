import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator } from '../komptaPayment.orchestrator';
import { TransactionManager } from '../transactionManager';
import { WalletModel, KomptaLedgerService } from '@ilot/infrastructure';

// 1. Mocks de base
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'tx_123' }] })
      };
      return callback(mockMongoSession, mockNeo4jTx);
    })
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  WalletModel: {
    findOne: vi.fn()
  },
  KomptaLedgerService: {
    recordEntry: vi.fn()
  }
}));

describe('KomptaPaymentOrchestrator - Le Gardien du Trésor', () => {
  let orchestrator: KomptaPaymentOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new KomptaPaymentOrchestrator();

    // 🛡️ SUTURE CHIRURGICALE : 
    // On réinjecte le comportement du mock ici pour qu'il survive aux nettoyages de Vitest
    vi.mocked(WalletModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({
        balance: 1000,
        currency: 'EUR',
        save: vi.fn().mockResolvedValue(true)
      })
    } as any);

    vi.mocked(KomptaLedgerService.recordEntry).mockResolvedValue(true as any);
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
        "Le montant du dépôt externe doit être supérieur à zéro."
      );
    });

    it('🟢 doit traiter un dépôt externe valide via webhook et retourner un succès', async () => {
      const payload = {
        id: 'evt_stripe_456',
        amount: 10000, // 100.00 EUR
        currency: 'eur',
        metadata: {
          recipientUid: 'bird_investor_1'
        }
      };

      const result = await orchestrator.processExternalPayment(payload);

      expect(result.success).toBe(true);
      expect(result.depositUid).toBe('evt_stripe_456');
      expect(TransactionManager.execute).toHaveBeenCalled();
      
      // On s'assure que la requête en base a bien été invoquée avec le bon UID
      expect(WalletModel.findOne).toHaveBeenCalledWith({ userId: 'bird_investor_1' });
    });
  });
});
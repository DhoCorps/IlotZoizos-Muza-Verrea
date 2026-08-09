// packages/shared-core/src/sync-engine/kompta.payment.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator } from '../komptaPayment.orchestrator';
import { WalletModel } from '../../../../infrastructure/src/database/models/nosql/wallet.model';
import { KomptaLedgerService } from '../../../../infrastructure/src/database/services/komptaLedgerService';
import { IlotError } from '../../errors/ilot.errors';

// 1. Mock complet du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = {
        run: vi.fn(async () => ({ records: [{ get: () => 'mock_uid' }] }))
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    })
  }
}));

// 2. Mock de WalletModel
vi.mock('../../../../infrastructure/src/database/models/nosql/wallet.model', () => ({
  WalletModel: {
    findOne: vi.fn()
  }
}));

// 3. MOCK DE LEDGER ENTRY MODEL (stoppe net le buffering Mongoose)
vi.mock('../../../../infrastructure/src/database/models/nosql/ledgerEntry.model', () => ({
  LedgerEntryModel: {
    findOne: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        session: vi.fn().mockResolvedValue(null)
      })
    })
  }
}));

// 4. Mock de KomptaLedgerService
vi.mock('../../../../infrastructure/src/database/services/komptaLedgerService', () => ({
  KomptaLedgerService: {
    recordEntry: vi.fn(async () => {})
  }
}));

describe('KomptaPaymentOrchestrator', () => {
  let orchestrator: KomptaPaymentOrchestrator;

  beforeEach(() => {
    orchestrator = new KomptaPaymentOrchestrator();
    vi.clearAllMocks();
  });

  describe('executeDirectTransfer', () => {
    it('devrait échouer si l\'acteur ne correspond pas à l\'expéditeur (usurpation)', async () => {
      const payload = {
        transferUid: 'tx_1',
        senderUid: 'bird_alice',
        recipientUid: 'bird_bob',
        amountCents: 100,
        currency: 'EUR'
      };
      const signature = { actorUid: 'bird_hacker', capabilities: [] };

      await expect(orchestrator.executeDirectTransfer(payload, signature)).rejects.toThrow(IlotError);
    });

    it('devrait échouer si le montant est inférieur ou égal à zéro', async () => {
      const payload = {
        transferUid: 'tx_1',
        senderUid: 'bird_alice',
        recipientUid: 'bird_bob',
        amountCents: 0,
        currency: 'EUR'
      };
      const signature = { actorUid: 'bird_alice', capabilities: [] };

      await expect(orchestrator.executeDirectTransfer(payload, signature)).rejects.toThrow("Le montant du transfert doit être supérieur à zéro.");
    });

    it('devrait réussir un transfert P2P et enregistrer les écritures Kompta', async () => {
      const payload = {
        transferUid: 'tx_1',
        senderUid: 'bird_alice',
        recipientUid: 'bird_bob',
        amountCents: 500,
        currency: 'EUR'
      };
      const signature = { actorUid: 'bird_alice', capabilities: [] };

      const mockSenderWallet = {
        userId: 'bird_alice',
        balance: 1000,
        currency: 'EUR',
        save: vi.fn()
      };

      const mockRecipientWallet = {
        userId: 'bird_bob',
        balance: 200,
        currency: 'EUR',
        save: vi.fn()
      };

      vi.mocked(WalletModel.findOne)
        .mockReturnValueOnce({
          session: vi.fn().mockResolvedValueOnce(mockSenderWallet)
        } as any)
        .mockReturnValueOnce({
          session: vi.fn().mockResolvedValueOnce(mockRecipientWallet)
        } as any);

      const result = await orchestrator.executeDirectTransfer(payload, signature);

      expect(result.success).toBe(true);
      expect(result.transferUid).toBe('tx_1');
      expect(mockSenderWallet.balance).toBe(500);
      expect(mockRecipientWallet.balance).toBe(700);
      
      // Vérification des appels au service ledger mocké
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(expect.objectContaining({
        ownerUid: 'bird_alice',
        type: 'DEBIT',
        category: 'SYSTEM_TRANSFER'
      }));
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(expect.objectContaining({
        ownerUid: 'bird_bob',
        type: 'CREDIT',
        category: 'SYSTEM_TRANSFER'
      }));
    });
  });

  describe('executeStoreTransaction', () => {
    it('devrait échouer si les fonds de l\'acheteur sont insuffisants', async () => {
      const payload = {
        transactionUid: 'store_tx_1',
        buyerUid: 'bird_alice',
        recipientUid: 'bird_merchant',
        amountCents: 2000,
        currency: 'EUR'
      };
      const signature = { actorUid: 'bird_alice', capabilities: [] };

      const mockBuyerWallet = {
        userId: 'bird_alice',
        balance: 500, // Insuffisant
        currency: 'EUR'
      };

      vi.mocked(WalletModel.findOne).mockReturnValueOnce({
        session: vi.fn().mockResolvedValueOnce(mockBuyerWallet)
      } as any);

      await expect(orchestrator.executeStoreTransaction(payload, signature)).rejects.toThrow("Fonds insuffisants pour finaliser l'achat");
    });
  });

  describe('executeItemExchange', () => {
    it('devrait réussir un troc d\'objet et consigner l\'écriture de type BARTER dans Kompta', async () => {
      const payload = {
        exchangeUid: 'ex_1',
        senderUid: 'bird_alice',
        recipientUid: 'bird_bob',
        offeredItemUid: 'item_canvas_1',
        targetTitle: 'Partition Partita'
      };
      const signature = { actorUid: 'bird_alice', capabilities: [] };

      const result = await orchestrator.executeItemExchange(payload, signature);

      expect(result.success).toBe(true);
      expect(result.exchangeUid).toBe('ex_1');
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(expect.objectContaining({
        ownerUid: 'bird_alice',
        category: 'BARTER',
        amountCents: 0
      }));
    });
  });
});
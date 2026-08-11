import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator, DirectTransferPayload } from '../komptaPayment.orchestrator';
import { TransactionManager } from '../transactionManager';
import { WalletModel } from '@ilot/infrastructure';
import { KomptaLedgerService } from '@ilot/infrastructure';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mocks de l'infrastructure et des services
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    // On mocke l'exécution pour qu'elle exécute simplement la callback passée en paramètre
    execute: vi.fn(async (description, callback) => {
      // Simule une session mongo et une transaction neo4j vides
      return await callback({}, { run: vi.fn().mockResolvedValue({ records: ['DUMMY_NEO_RESULT'] }) });
    })
  }
}));

vi.mock('@ilot/infrastructure');
vi.mock('@/infrastructure');

describe('KomptaPaymentOrchestrator (Orchestrateur de Paiements)', () => {
  const orchestrator = new KomptaPaymentOrchestrator();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeDirectTransfer (Transfert P2P)', () => {
    const mockPayload: DirectTransferPayload = {
      transferUid: 'tr_test_01',
      senderUid: 'bird_sandy',
      recipientUid: 'bird_fatijah',
      amountCents: 1000, // 10.00 TOX
      currency: 'TOX',
      description: 'Paiement test'
    };

    const mockSignature = { actorUid: 'bird_sandy', capabilities: [], ipAddress: '127.0.0.1' };

    it('🔴 doit rejeter le transfert si la signature ne correspond pas à l\'expéditeur', async () => {
      const invalidSignature = { ...mockSignature, actorUid: 'bird_hacker' };
      
      await expect(
        orchestrator.executeDirectTransfer(mockPayload, invalidSignature)
      ).rejects.toThrow(IlotError);
      expect(IlotError).toHaveProperty('name', 'IlotError'); // Vérification du type d'erreur
    });

    it('🔴 doit rejeter le transfert si le solde de l\'expéditeur est insuffisant', async () => {
      const mockSenderWallet = { 
        userId: 'bird_sandy', 
        balance: 500, 
        currency: 'TOX', 
        save: vi.fn() // 👈 AJOUTE CETTE LIGNE ICI pour éviter l'erreur de fonction absente
      };

      vi.mocked(WalletModel.findOne).mockImplementation((query: any) => {
        const targetWallet = query.userId === 'bird_sandy' ? mockSenderWallet : null;

        return {
          session: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue(targetWallet),
          then: (resolve: any) => resolve(targetWallet)
        } as any;
      });

      await expect(
        orchestrator.executeDirectTransfer(mockPayload, mockSignature)
      ).rejects.toThrow('Fonds insuffisants');
    });
    
    it('🟢 doit exécuter le transfert, mettre à jour les portefeuilles et enregistrer les écritures Ledger', async () => {
      // Simulation des portefeuilles existants
      const mockSenderWallet = { userId: 'bird_sandy', balance: 1500, currency: 'TOX', save: vi.fn() };
      const mockRecipientWallet = { userId: 'bird_fatijah', balance: 200, currency: 'TOX', save: vi.fn() };

      vi.mocked(WalletModel.findOne).mockImplementation((query: any) => {
        const targetWallet = query.userId === 'bird_sandy' ? mockSenderWallet : 
                             query.userId === 'bird_fatijah' ? mockRecipientWallet : null;

        return {
          session: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue(targetWallet),
          then: (resolve: any) => resolve(targetWallet) // Permet aussi un await direct si besoin
        } as any;
      });

      const result = await orchestrator.executeDirectTransfer(mockPayload, mockSignature);

      // Vérifications
      expect(result.success).toBe(true);
      expect(mockSenderWallet.balance).toBe(500); // 1500 - 1000
      expect(mockRecipientWallet.balance).toBe(1200); // 200 + 1000
      
      // Vérification que les deux écritures Ledger ont bien été enregistrées
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
      
      // Vérification de l'écriture de Débit (expéditeur)
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(expect.objectContaining({
        ownerUid: 'bird_sandy',
        counterpartyUid: 'bird_fatijah',
        type: 'DEBIT',
        amount: 10, // 1000 cents / 100
        currency: 'TOX'
      }));

      // Vérification de l'écriture de Crédit (destinataire)
      expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(expect.objectContaining({
        ownerUid: 'bird_fatijah',
        counterpartyUid: 'bird_sandy',
        type: 'CREDIT',
        amount: 10,
        currency: 'TOX'
      }));

      // Vérification que Neo4j a bien été appelé via TransactionManager
      expect(TransactionManager.execute).toHaveBeenCalled();
    });
  });
});
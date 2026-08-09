// packages/shared-core/src/types/__tests__/payment.types.test.ts
import { describe, it, expect } from 'vitest';
import { UserWallet, BankAccountInfo, DirectTransactionPayload } from '../core/payment.types';

describe('Payment Types & Interfaces - L\'Îlot Zoizos', () => {
  it('doit valider la structure complète d\'un UserWallet avec ses comptes liés', () => {
    const mockBankAccount: BankAccountInfo = {
      providerId: 'tok_visa_debit_123',
      last4: '4242',
      brand: 'Visa',
      bankName: 'Banque de la Canopée',
      isDefault: true,
    };

    const mockWallet: UserWallet = {
      userId: 'oiseau_dho_123',
      balance: 15000, // 150,00 EUR en centimes
      currency: 'EUR',
      linkedAccounts: [mockBankAccount],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(mockWallet.userId).toBe('oiseau_dho_123');
    expect(mockWallet.balance).toBe(15000);
    expect(mockWallet.currency).toBe('EUR');
    expect(mockWallet.linkedAccounts).toHaveLength(1);
    expect(mockWallet.linkedAccounts[0].isDefault).toBe(true);
    expect(mockWallet.linkedAccounts[0].last4).toBe('4242');
  });

  it('doit valider la structure d\'une transaction directe P2P', () => {
    const mockTransaction: DirectTransactionPayload = {
      transactionId: 'tx_uuid_987654',
      senderId: 'oiseau_client_1',
      recipientId: 'oiseau_vendeur_2',
      amount: 2500, // 25,00 EUR
      currency: 'EUR',
      status: 'completed',
      metadata: {
        sourcePage: '/fr/games/soonart/galerie-1',
        itemId: 'art_toile_99',
        description: 'Achat d\'une œuvre sur Soon\'Art',
      },
      createdAt: new Date(),
    };

    expect(mockTransaction.transactionId).toBe('tx_uuid_987654');
    expect(mockTransaction.senderId).toBe('oiseau_client_1');
    expect(mockTransaction.recipientId).toBe('oiseau_vendeur_2');
    expect(mockTransaction.amount).toBe(2500);
    expect(mockTransaction.status).toBe('completed');
    expect(mockTransaction.metadata?.itemId).toBe('art_toile_99');
  });
});
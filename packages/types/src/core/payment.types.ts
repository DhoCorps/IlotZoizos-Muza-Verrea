// packages/shared-core/src/types/payment.types.ts

export type PaymentProviderType = 'iban' | 'card' | 'virtual_wallet';

export interface BankAccountInfo {
  providerId: string; // Ex: ID du compte tokenisé (Stripe ou équivalent)
  last4?: string;     // Derniers chiffres de la carte ou IBAN masqué
  brand?: string;     // Ex: Visa, Mastercard, SEPA
  bankName?: string;
  isDefault: boolean;
}

export interface UserWallet {
  userId: string;
  balanceCents: number; // 🚀 Harmonisé en centimes stricts pour éviter les erreurs d'arrondi
  currency: string;     // 'EUR'
  linkedAccounts: BankAccountInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectTransactionPayload {
  transactionId: string;
  senderId: string;
  recipientId: string;
  amountCents: number; // 🚀 Harmonisé en centimes stricts
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: {
    sourcePage?: string;
    itemId?: string;
    description?: string;
  };
  createdAt: Date;
}
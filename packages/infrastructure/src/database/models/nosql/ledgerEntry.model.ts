// infrastructure/src/database/models/nosql/ledgerEntry.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerEntry extends Document {
  entryUid: string;
  ownerUid: string;          // L'oiseau concerné par cette écriture (acheteur ou vendeur)
  counterpartyUid: string;   // L'autre partie (émetteur ou destinataire)
  amountCents: number;
  currency: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'TIP' | 'STORE_SALE' | 'STORE_PURCHASE' | 'BARTER' | 'SYSTEM_TRANSFER';
  referenceUid: string;      // ID de la transaction ou de l'échange d'origine
  description: string;
  previousHash?: string;     // Hash de l'écriture précédente pour l'inaltérabilité
  entryHash: string;         // Hash de l'écriture courante
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>({
  entryUid: { type: String, required: true, unique: true },
  ownerUid: { type: String, required: true, index: true },
  counterpartyUid: { type: String, required: true },
  amountCents: { type: Number, required: true },
  currency: { type: String, default: 'EUR' },
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  category: { 
    type: String, 
    enum: ['TIP', 'STORE_SALE', 'STORE_PURCHASE', 'BARTER', 'SYSTEM_TRANSFER'], 
    required: true 
  },
  referenceUid: { type: String, required: true },
  description: { type: String, required: true },
  previousHash: { type: String },
  entryHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const LedgerEntryModel = mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
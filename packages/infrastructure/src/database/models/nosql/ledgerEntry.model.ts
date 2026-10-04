// packages/infrastructure/src/database/models/nosql/ledgerEntry.model.ts
import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

export interface ILedgerEntry extends Document {
  entryUid: string;
  ownerUid: string;          // L'oiseau concerné par cette écriture (acheteur ou vendeur)
  counterpartyUid: string;   // L'autre partie (émetteur, destinataire, ou SYSTEM)
  counterpartyPseudo?: string; // 🚀 NOUVEAU : Pseudo de la contrepartie (pour l'affichage ERP)
  amountCents: number;       // TTC ou Total
  amountHTCents?: number;    // 🚀 NOUVEAU : Ventilation HT
  taxCents?: number;         // 🚀 NOUVEAU : TVA appliquée
  feeCents?: number;         // 🚀 NOUVEAU : Frais de plateforme / Stripe
  currency: string;
  type: 'CREDIT' | 'DEBIT';
  // 🪶 Ajout de 'REWARD' pour le système de récompenses de Poetrik et de la Canopée
  category: 'TIP' | 'STORE_SALE' | 'STORE_PURCHASE' | 'BARTER' | 'SYSTEM_TRANSFER' | 'CANOPY_TAX_REVENUE' | 'BET_WIN' | 'BET_LOSS' | 'SUBSIDY' | 'EXTERNAL_DEPOSIT' | 'REWARD';
  referenceUid: string;      // ID de la transaction d'origine (ex: UID du poème)
  orderUid?: string;         // 🚀 NOUVEAU : Lien direct avec la commande e-commerce
  invoiceUid?: string;       // 🚀 NOUVEAU : Lien direct avec la facture
  description: string;
  previousHash?: string;     // Hash de l'écriture précédente
  entryHash: string;         // Hash de l'écriture courante
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>({
  entryUid: { type: String, required: true, unique: true },
  ownerUid: { type: String, required: true, index: true },
  counterpartyUid: { type: String, required: true },
  counterpartyPseudo: { type: String },
  amountCents: { type: Number, required: true },
  amountHTCents: { type: Number },
  taxCents: { type: Number },
  feeCents: { type: Number },
  currency: { type: String, default: 'EUR' }, // Peut aussi être 'PARCHEMIN'
  type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
  category: { 
    type: String, 
    // 🪶 REWARD ajouté ici
    enum: ['TIP', 'STORE_SALE', 'STORE_PURCHASE', 'BARTER', 'SYSTEM_TRANSFER', 'CANOPY_TAX_REVENUE', 'BET_WIN', 'BET_LOSS', 'SUBSIDY', 'EXTERNAL_DEPOSIT', 'REWARD'], 
    required: true 
  },
  referenceUid: { type: String, required: true },
  orderUid: { type: String, index: true },
  invoiceUid: { type: String, index: true },
  description: { type: String, required: true },
  previousHash: { type: String },
  entryHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// 🚀 Index pour optimiser les requêtes analytiques (Mensuel par contrepartie)
LedgerEntrySchema.index({ counterpartyUid: 1, createdAt: -1 });

export const LedgerEntryModel = mongoose.models.LedgerEntry || mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
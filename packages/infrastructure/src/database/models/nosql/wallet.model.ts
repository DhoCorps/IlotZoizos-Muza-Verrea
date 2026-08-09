// packages/infrastructure/src/database/models/wallet.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletDocument extends Document {
  userId: string;
  balance: number;
  currency: string;
  linkedAccounts: {
    providerId: string;
    last4?: string;
    brand?: string;
    bankName?: string;
    isDefault: boolean;
  }[];
}

const WalletSchema = new Schema<IWalletDocument>({
  userId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 0 }, // 👈 Utiliser 'Number' avec une majuscule ici
  currency: { type: String, default: 'EUR' },
  linkedAccounts: [{
    providerId: { type: String, required: true },
    last4: { type: String },
    brand: { type: String },
    bankName: { type: String },
    isDefault: { type: Boolean, default: false }
  }]
}, { timestamps: true });

export const WalletModel = mongoose.models.Wallet || mongoose.model<IWalletDocument>('Wallet', WalletSchema);
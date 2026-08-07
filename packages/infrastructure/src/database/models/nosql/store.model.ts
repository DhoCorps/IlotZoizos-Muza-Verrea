import mongoose, { Document } from 'mongoose';

const { Schema } = mongoose;


export interface IStoreDocument extends Document {
  uid: string;
  ownerUid: string;
  storeName: string;
  slug: string; // 🪡
  description?: string;
  stripeAccountId?: string;
  isVerified: boolean;
  createdAt: Date;
}

const StoreSchema = new Schema<IStoreDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  ownerUid: { type: String, required: true, index: true },
  storeName: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡 INDEXÉ POUR LA RECHERCHE PAR URL
  description: { type: String, maxlength: 300 },
  stripeAccountId: { type: String, trim: true }, // Le compte Stripe Connect de l'Oiseau
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

export const StoreModel = mongoose.models.Store || mongoose.model<IStoreDocument>('Store', StoreSchema);
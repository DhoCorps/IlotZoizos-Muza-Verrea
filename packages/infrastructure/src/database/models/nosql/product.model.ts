import mongoose, { Schema, Document } from 'mongoose';

export interface IProductDocument extends Document {
  uid: string;
  storeUid: string;
  title: string;
  slug: string; // 🪡
  description: string;
  priceCents: number;
  currency: string;
  stock: number;
  category: string;
  imageUrl?: string;
  createdAt: Date;
}

const ProductSchema = new Schema<IProductDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  storeUid: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡 INDEXÉ POUR LA RECHERCHE PAR URL
  description: { type: String, required: true },
  priceCents: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'EUR' },
  stock: { type: Number, default: 1, min: 0 },
  category: { 
    type: String, 
    enum: ['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL'],
    required: true 
  },
  imageUrl: { type: String, trim: true },
}, { timestamps: true });

export const ProductModel = mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);
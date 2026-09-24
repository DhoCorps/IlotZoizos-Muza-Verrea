import mongoose from 'mongoose'; 
import type { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;
import { v4 as uuidv4 } from 'uuid';
import { IProduct } from '@ilot/types'; 

/**
 * 🏗️ PRODUCT DOCUMENT
 */
export interface IProductDocument extends Omit<IProduct, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schéma Mongoose pour les déclinaisons (variantes)
const ProductVariantSchema = new Schema({
  uid: { type: String, required: true, default: () => uuidv4() },
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  priceOffsetCents: { type: Number, default: 0 },
  costPriceCents: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 1 },
  attributes: { type: Map, of: String }
}, { _id: false });

const ProductSchema = new Schema<IProductDocument>(
  {
    // --- 🌉 LE PONT NEO4J ---
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    },
    storeUid: { type: String, required: true, index: true },

    // --- 🛡️ SUTURES DE SOUVERAINETÉ & INDEXATION ---
    ownerUid: { type: String, index: true },
    ownerSlug: { type: String, index: true },
    sellerUid: { type: String, index: true },

    // --- 🏷️ IDENTITÉ & CONTENU ---
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, trim: true, index: true }, 
    description: { type: String, required: true, maxlength: 5000 },
    
    // --- 💰 GESTION FINANCIÈRE ---
    nature: { 
      type: String, 
      enum: ['PHYSICAL', 'DIGITAL'], 
      default: 'DIGITAL' 
    },
    priceExclTaxCents: { type: Number, min: 0, default: 0 },
    taxRatePercent: { type: Number, min: 0, default: 0 },
    priceCents: { type: Number, required: true, min: 0 }, 
    costPriceCents: { type: Number, min: 0, default: 0 }, 
    marginCents: { type: Number }, 
    marginPercent: { type: Number }, 
    
    currency: { type: String, default: 'EUR' },
    stock: { type: Number, min: 0, default: 1 },

    // --- 🎨 DÉCLINAISONS ---
    variants: [ProductVariantSchema],

    // --- 🏷️ TAGS & SEO ---
    tags: { type: [{ type: String, lowercase: true, trim: true }] },
    seoMetadata: {
      title: { type: String, trim: true },
      description: { type: String, trim: true }
    },

    // --- 📜 COPYRIGHT ET EXCLUSIVITÉ ÎLOT (DRY) ---
    copyrightMetadata: {
      role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'], default: 'CREATOR' },
      originalAuthor: { type: String, trim: true },
      originalWorkTitle: { type: String, trim: true },
      sublimationNotes: { type: String, trim: true },
      isExclusiveIlot: { type: Boolean, default: false }
    },

    // --- 🎡 OPTIONS DE LA ROULETTE KARMIQUE ---
    isRouletteActive: { type: Boolean, default: false },
    wagerAmount: { type: Number, min: 0, default: 0 },
    secretPriceCents: { type: Number, min: 0 },

    category: { 
      type: String, 
      required: true,
      enum: ['FONT_SPRITE', 'DIGITAL_GOOD', 'PHYSICAL_ARTIFACT', 'LORE_SCROLL', 'LUCKY_DROP'],
      index: true
    },
    imageUrl: { type: String, trim: true },
    visibility: { 
      type: String, 
      enum: ['PUBLIC', 'EXCHANGEABLE', 'VISIBLE', 'PRIVATE'],
      default: 'PUBLIC' 
    },
    settings: { type: Schema.Types.Mixed }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: (_, ret: any) => { 
        delete ret._id; 
        delete ret.__v;
        return ret;
      } 
    }
  }
);

// 🔍 INDEX DE RECHERCHE UNIQUE
ProductSchema.index({ tags: 1 });
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const ProductModel = (mongoose.models.Product as Model<IProductDocument>) || 
                            mongoose.model<IProductDocument>('Product', ProductSchema);
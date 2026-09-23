import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;
import { v4 as uuidv4 } from 'uuid';

/**
 * 🏗️ ROULETTE SESSION DOCUMENT
 * Représente un tirage karmique en cours ou passé.
 */
export interface IRouletteSessionDocument extends Document {
  _id: Types.ObjectId;
  uid: string;
  buyerUid: string;
  productUid: string;
  rolledPriceCents: number;
  wagerAmount: number; // Historisation de la mise (Shards) perdue/dépensée
  status: 'PENDING' | 'BOUGHT' | 'ABANDONED';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RouletteSessionSchema = new Schema<IRouletteSessionDocument>(
  {
    // --- 🌉 IDENTIFIANTS UNIQUES ---
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    },
    buyerUid: { type: String, required: true, index: true },
    productUid: { type: String, required: true, index: true },

    // --- 💰 GESTION FINANCIÈRE ET KARMIQUE ---
    rolledPriceCents: { 
      type: Number, 
      required: true, 
      min: [0, 'Le prix tiré ne peut pas être négatif'] 
    },
    wagerAmount: { 
      type: Number, 
      required: true, 
      min: [0, 'La mise ne peut pas être négative'],
      default: 0
    },

    // --- 🚦 ÉTAT DE LA SESSION ---
    status: {
      type: String,
      enum: ['PENDING', 'BOUGHT', 'ABANDONED'],
      default: 'PENDING',
      index: true
    },

    // --- ⏳ GESTION DU TEMPS (Blocage 24h) ---
    expiresAt: { 
      type: Date, 
      required: true,
      index: true // Permet à un cron job de trouver rapidement les sessions à basculer en 'ABANDONED'
    }
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

// 🔍 INDEX COMPOSÉ POUR LE BLOCAGE ANTI-SPAM
// Permet de vérifier instantanément si un oiseau a déjà une session "PENDING" sur ce produit exact
RouletteSessionSchema.index({ buyerUid: 1, productUid: 1, status: 1 });

export const RouletteModel = (mongoose.models.RouletteSession as Model<IRouletteSessionDocument>) || 
                             mongoose.model<IRouletteSessionDocument>('RouletteSession', RouletteSessionSchema);
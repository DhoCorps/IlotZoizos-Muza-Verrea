// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model, Types } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { ISujet, SujetCategorySchema, SujetStatusSchema } from '@ilot/types'; 

export interface ISujetDocument extends Omit<ISujet, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SujetSchema = new Schema<ISujetDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },

    // --- IDENTITÉ & CONTENU ---
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    
    // 🪡 NOUVEAUX CHAMPS LITTÉRAIRES
    lyrics: { type: String },
    copyright: { type: String },

    authorUid: { type: String, required: true, index: true },

    // --- VIBRATION & ÉTAT ---
    category: {
      type: String,
      enum: SujetCategorySchema.options,
      default: 'MONOLOGUE'
    },
    status: {
      type: String,
      enum: SujetStatusSchema.options,
      default: 'DRAFT',
      index: true
    },
    tags: [{ type: String, index: true }],

    // --- LE TISSU CONNECTEUR ---
    connections: {
      relatedProjects: [{ type: String }],
      relatedTasks: [{ type: String }],
      relatedProducts: [{ type: String }],
      relatedGames: [{ type: String }]
    },

    // 🛍️ SUTURE E-COMMERCE MONGODB
    merchLink: {
      productId: { type: String },
      sku: { type: String },
      displayMode: { type: String, default: 'card' }
    },

    // --- MÉDIAS & ANCRAGES SENSORIELS ---
    media: {
      coverImageUrl: { type: String },
      audioTrackUrl: { type: String } 
    },

    // --- GOUVERNANCE & MODÉRATION ---
    settings: {
      allowComments: { type: Boolean, default: true },
      allowEmojiReactions: { type: Boolean, default: true },
      isAgeRestricted: { type: Boolean, default: false }
    },

    // --- STATISTIQUES ---
    resonance: {
      views: { type: Number, default: 0 },
      readsCompleted: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

SujetSchema.index({ title: 'text', content: 'text', lyrics: 'text', tags: 'text' });

export const SujetModel = (mongoose.models.Sujet as Model<ISujetDocument>) || 
                        mongoose.model<ISujetDocument>('Sujet', SujetSchema);
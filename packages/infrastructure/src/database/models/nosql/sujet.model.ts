import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';
const { Schema, model, models } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { ISujet, SujetCategorySchema, SujetStatusSchema } from '@ilot/types'; 

export interface ISujetDocument extends Omit<ISujet, '_id' | 'publishedAt'>, Document {
  _id: Types.ObjectId;
  publishedAt?: Date;
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
    subtitle: { type: String, trim: true },
    excerpt: { type: String, trim: true, maxlength: 300 },
    content: { type: String, required: true },
    
    // --- CHAMPS LITTÉRAIRES ---
    lyrics: { type: String },
    copyright: { type: String },

    authorUid: { type: String, required: true, index: true },

    // --- VIBRATION, TEMPS & ÉTAT ---
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

    publishedAt: { type: Date },
    readingTimeMinutes: { type: Number, default: 1 },

    // --- 🔍 OPTIMISATION SEO (Mutualisé) ---
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      ogImageUrl: { type: String },
      canonicalUrl: { type: String }
    },

    // --- 🌐 LE TISSU CONNECTEUR (Graph & Cross-Links) ---
    connections: {
      relatedProjects: [{ type: String }],
      relatedTasks: [{ type: String }],
      relatedProducts: [{ type: String }],
      relatedGames: [{ type: String }],
      crossLinks: [{
        entityType: { 
          type: String, 
          enum: ['BLOG', 'PROJECT', 'FONT', 'SPRITE', 'PROFILE', 'GAME'],
          required: true 
        },
        entityId: { type: String, required: true },
        label: { type: String }
      }]
    },

    // 🛍️ SUTURE E-COMMERCE
    merchLink: {
      productId: { type: String },
      sku: { type: String },
      displayMode: { type: String, default: 'card' }
    },

    // --- 🖼️ MÉDIAS (Accessibilité SEO) ---
    media: {
      coverImageUrl: { type: String },
      coverImageAlt: { type: String },
      audioTrackUrl: { type: String },
      audioTitle: { type: String }
    },

    // --- GOUVERNANCE & SOUVERAINETÉ ---
    settings: {
      allowComments: { type: Boolean, default: true },
      allowEmojiReactions: { type: Boolean, default: true },
      isAgeRestricted: { type: Boolean, default: false },
      alchemicalTransmuted: { type: Boolean, default: false }
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
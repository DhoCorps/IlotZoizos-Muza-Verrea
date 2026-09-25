// Fichier : packages/infrastructure/src/nosql/sujet.model.ts
import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';
const { Schema, model, models } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IFiliationSource, ISujet, SujetCategorySchema, SujetStatusSchema } from '@ilot/types'; 

export interface ISujetFiliationSource {
  isExternalSource: boolean;
  sourceAuthorName: string;
  sourceWorkTitle: string;
  sourceReferenceUrl?: string;
  claimStatus: 'PENDING_CLAIM' | 'SHARED' | 'REVOKED';
  escrowBalance: number;
  derivativeType?: string;
}

export interface ISujetDocument extends Omit<ISujet, '_id' | 'publishedAt' | 'lastCommentedAt'>, Document {
  _id: Types.ObjectId;
  publishedAt?: Date;
  lastCommentedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 🚀 Sous-schéma Mongoose du Pacte de Filiation
const FiliationSourceSchema = new Schema<ISujetFiliationSource>({
  isExternalSource: { type: Boolean, default: false },
  sourceAuthorName: { type: String, trim: true },
  sourceWorkTitle: { type: String, trim: true },
  sourceReferenceUrl: { type: String, trim: true },
  claimStatus: { type: String, enum: ['PENDING_CLAIM', 'SHARED', 'REVOKED'], default: 'PENDING_CLAIM' },
  escrowBalance: { type: Number, default: 0, min: 0 },
  derivativeType: { type: String, trim: true }
}, { _id: false });

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
    
    // --- CHAMPS LITTÉRAIRES & COPYRIGHT (DRY + Filiation) ---
    lyrics: { type: String },
    copyright: { type: String },
    copyrightMetadata: {
      role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'], default: 'CREATOR' },
      originalAuthor: { type: String, trim: true },
      originalWorkTitle: { type: String, trim: true },
      sublimationNotes: { type: String, trim: true },
      isExclusiveIlot: { type: Boolean, default: false },
      filiation: { type: FiliationSourceSchema } // 🚀 Intégration du Pacte de Filiation
    },

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
          enum: ['BLOG', 'PROJECT', 'FONT', 'SPRITE', 'PROFILE', 'GAME', 'LYRIKA', 'SAMPLOTEK', 'BIBLIOTEK', 'POETRIK'],
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
      allowPropagation: { type: Boolean, default: true },
      isAgeRestricted: { type: Boolean, default: false },
      alchemicalTransmuted: { type: Boolean, default: false }
    },

    // --- STATISTIQUES DE BASE ---
    resonance: {
      views: { type: Number, default: 0 },
      readsCompleted: { type: Number, default: 0 }
    },

    // --- 🌊 PROPAGATION & VIRALITÉ ORGANIQUE ---
    propagation: {
      shareCount: { type: Number, default: 0 },
      uniquePasseurs: { type: Number, default: 0 },
      globalReach: { type: Number, default: 0 }
    },

    // --- 🌟 EXTENSIONS KOSMIQUES ---
    kosmicBoon: {
      interactionCount: { type: Number, default: 0 },
      nextKosmicBoon: { type: Number, default: 42 }
    },
    lastCommentedAt: { type: Date, index: true }
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
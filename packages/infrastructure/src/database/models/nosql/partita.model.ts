// Fichier : packages/infrastructure/src/nosql/partita.model.ts
import mongoose from 'mongoose'; 
import type { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IPartita, InstrumentCategorySchema, ScoreFormatSchema } from '@ilot/types';

export interface IPartitaDocument extends Omit<IPartita, '_id' | 'lastCommentedAt'>, Document {
  _id: Types.ObjectId;
  lastCommentedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 🚀 Sous-schéma Mongoose du Pacte de Filiation
const FiliationSourceSchema = new Schema({
  isExternalSource: { type: Boolean, default: false },
  sourceAuthorName: { type: String, trim: true },
  sourceWorkTitle: { type: String, trim: true },
  sourceReferenceUrl: { type: String, trim: true },
  claimStatus: { type: String, enum: ['PENDING_CLAIM', 'SHARED', 'REVOKED'], default: 'PENDING_CLAIM' },
  escrowBalance: { type: Number, default: 0, min: 0 },
  derivativeType: { type: String, trim: true }
}, { _id: false });

// 🚀 Sous-schéma Mongoose pour Copyright 
const CopyrightMetadataSchema = new Schema({
  role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'], default: 'CREATOR' },
  originalAuthor: { type: String, trim: true },
  originalWorkTitle: { type: String, trim: true },
  sublimationNotes: { type: String, trim: true },
  isExclusiveIlot: { type: Boolean, default: false },
  license: { type: String, default: 'MIT / Libre Canopée' },
  filiation: { type: FiliationSourceSchema } 
}, { _id: false });

// 🚀 Sous-schéma Mongoose du Sceau Cryptographique Unifié
const CryptographicSealSchema = new Schema({
  digitalSignature: { type: String, required: true, index: true },
  timestampedAt: { type: Date, required: true, default: Date.now },
  sealedByUid: { type: String },
  copyrightMetadata: { type: CopyrightMetadataSchema }
}, { _id: false });

const PartitaSchema = new Schema<IPartitaDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    instrument: {
      type: String,
      enum: InstrumentCategorySchema.options,
      default: 'BASS',
      index: true
    },
    format: {
      type: String,
      enum: ScoreFormatSchema.options,
      default: 'ABC'
    },
    tuning: { type: String, default: 'E1-A1-D2-G2' },
    authorUid: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED'],
      default: 'DRAFT',
      index: true
    },
    tags: [{ type: String, index: true }],
    
    // 🔍 OPTIMISATION SEO
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      ogImageUrl: { type: String },
      canonicalUrl: { type: String }
    },

    // 📜 SCEAU CRYPTOGRAPHIQUE UNIFIÉ (Optionnel par défaut)
    cryptoSeal: {
      type: CryptographicSealSchema,
      default: undefined
    },

    connections: {
      relatedProjects: [{ type: String }],
      relatedTasks: [{ type: String }],
      relatedProducts: [{ type: String }],
      relatedGames: [{ type: String }]
    },
    merchLink: {
      productId: { type: String },
      sku: { type: String },
      displayMode: { type: String, default: 'card' }
    },
    media: {
      coverImageUrl: { type: String },
      audioTrackUrl: { type: String }
    },
    settings: {
      allowComments: { type: Boolean, default: true },
      allowEmojiReactions: { type: Boolean, default: true }
    },
    resonance: {
      views: { type: Number, default: 0 },
      readsCompleted: { type: Number, default: 0 }
    },
    
    // 🚀 SUTURE UNIVERSAL COMMENT : Marqueur temporel pour le tri et les remontées
    lastCommentedAt: { type: Date, index: true }
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

PartitaSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const PartitaModel = (mongoose.models.Partita as Model<IPartitaDocument>) || 
                           mongoose.model<IPartitaDocument>('Partita', PartitaSchema);
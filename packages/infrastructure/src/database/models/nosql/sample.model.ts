// packages/infrastructure/src/database/models/nosql/sample.model.ts
// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

import { ISample } from '@ilot/types';

export interface ISampleDocument extends ISample, Document {}

const SampleSchema = new Schema<ISampleDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  audioUrl: { type: String, required: true },
  storageKey: { type: String, required: true },
  tempoBpm: { type: Number, required: true, index: true },
  musicalKey: { type: String, required: true, index: true },
  style: { type: String, required: true, index: true },
  
  // Alignement sur le standard de l'Îlot (remplace creatorUid/creatorSlug)
  authorUid: { type: String, required: true, index: true },
  authorPseudo: { type: String },

  permissions: {
    allowRadio: { type: Boolean, default: true },
    allowBlindTest: { type: Boolean, default: true },
    allowShowcase: { type: Boolean, default: true },
  },

  // 🛡️ Module de Modération
  moderation: {
    reportsCount: { type: Number, default: 0 },
    isQuarantined: { type: Boolean, default: false, index: true },
  },

  // 🚦 Statut de publication
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED', 'QUARANTINED'],
    default: 'PUBLISHED',
    index: true
  },

  // 🔍 Module SEO
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }],
    ogImageUrl: { type: String }
  },
  
  // 📜 Sceau Cryptographique Unifié (Remplace digitalSignature et copyrightClaimed)
  cryptoSeal: {
    digitalSignature: { type: String },
    timestampedAt: { type: Date },
    uid: { type: String },
    copyrightMetadata: {
      role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'] },
      isExclusiveIlot: { type: Boolean, default: true },
      license: { type: String },
      originalAuthor: { type: String },
      originalWorkTitle: { type: String },
      sublimationNotes: { type: String },
      filiation: { type: Schema.Types.Mixed }
    }
  },

  createdAt: { type: Date, default: Date.now }
});

// 🚀 Index composé pour les recherches rapides du séquenceur (exclut les quarantaines)
SampleSchema.index({ status: 1, 'moderation.isQuarantined': 1, style: 1, tempoBpm: 1 });

export const SampleModel: Model<ISampleDocument> =
  mongoose.models.Sample || mongoose.model<ISampleDocument>('Sample', SampleSchema);
// packages/infrastructure/src/database/models/nosql/poem.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { IPoemDTO } from '@ilot/types';

export interface IPoemDocument extends Omit<IPoemDTO, 'createdAt' | 'updatedAt'>, Document {}

const PoemSchema = new Schema<IPoemDocument>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    authorUid: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String, default: 'fr' },
    
    // 📐 Structure
    format: { type: String, default: 'FREE_VERSE' },
    syllableStructure: [{ type: Number }],
    
    // 🎶 Ambiance Sonore
    audioAmbiance: {
      trackUrl: { type: String },
      linkedEntityUid: { type: String }
    },

    // 🌍 SEO
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String }
    },

    // 🛡️ Sceau & Propriété Intellectuelle
    cryptoSeal: {
      digitalSignature: { type: String },
      timestamp: { type: Date },
      copyrightMetadata: { type: Schema.Types.Mixed } // Mixte pour s'adapter au Zod Record
    },

    // ⚙️ Le Voile de Catharsis
    settings: {
      catharsisVeil: { type: Boolean, default: false }
    },

    status: { type: String, default: 'DRAFT', index: true },
    visibility: { type: String, default: 'PUBLIC', index: true }
  },
  { 
    timestamps: true 
  }
);

// 🔍 Indexation textuelle pour La Fontaine des Vers (Agora)
PoemSchema.index({ title: 'text', content: 'text' });

export const PoemModel: Model<IPoemDocument> =
  mongoose.models.Poem || mongoose.model<IPoemDocument>('Poem', PoemSchema);
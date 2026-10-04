// packages/infrastructure/src/database/models/nosql/lexiconEntry.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILexiconEntryDTO } from '@ilot/types';

export interface ILexiconDocument extends Omit<ILexiconEntryDTO, 'createdAt' | 'updatedAt'>, Document {}

const LexiconEntrySchema = new Schema<ILexiconDocument>(
  {
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    languageCode: { 
      type: String, 
      required: true, 
      index: true 
    },
    word: { 
      type: String, 
      required: true, 
      index: true 
    },
    phoneticIpa: { 
      type: String, 
      required: true 
    },
    syllableCount: { 
      type: Number, 
      required: true, 
      min: 1,
      default: 1
    },
    definitions: { 
      type: Schema.Types.Mixed, // Permet de stocker le Record<string, string> de Zod
      required: true,
      default: {}
    },
    partOfSpeech: { 
      type: String, 
      required: true, 
      index: true,
      default: 'noun'
    },
    // 🔗 Réseaux phonétiques et sémantiques en miroir du Zod Schema
    rhymesWith: [{
      targetUid: { type: String, required: true },
      type: { type: String, required: true },
      match: { type: String, required: true }
    }],
    translations: [{
      targetUid: { type: String, required: true },
      lang: { type: String, required: true }
    }]
  },
  { 
    timestamps: true 
  }
);

// Indexation textuelle et composée pour optimiser les requêtes de l'Oracle
LexiconEntrySchema.index({ languageCode: 1, word: 1 });
LexiconEntrySchema.index({ word: 'text', phoneticIpa: 'text' });

export const LexiconEntryModel: Model<ILexiconDocument> =
  mongoose.models.LexiconEntry || mongoose.model<ILexiconDocument>('LexiconEntry', LexiconEntrySchema);
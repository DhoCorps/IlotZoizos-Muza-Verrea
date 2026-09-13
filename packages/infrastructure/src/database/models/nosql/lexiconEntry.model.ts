// src/models/LexiconEntry.ts

import mongoose, { Schema, Document, Model } from 'mongoose';
import { ILexiconEntry } from '@ilot/types';

export interface ILexiconDocument extends ILexiconEntry, Document {}

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
      min: 1 
    },
    definitions: { 
      type: Object, 
      required: true 
    },
    partOfSpeech: { 
      type: String, 
      required: true, 
      index: true 
    },
  },
  { 
    timestamps: true 
  }
);

// Indexation textuelle et composée pour optimiser les recherches futures
LexiconEntrySchema.index({ languageCode: 1, word: 1 });
LexiconEntrySchema.index({ word: 'text', phoneticIpa: 'text' });

export const LexiconEntryModel: Model<ILexiconDocument> =
  mongoose.models.LexiconEntry || mongoose.model<ILexiconDocument>('LexiconEntry', LexiconEntrySchema);
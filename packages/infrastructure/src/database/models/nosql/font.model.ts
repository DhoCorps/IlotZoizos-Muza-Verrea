// packages/infrastructure/src/database/models/nosql/font.model.ts
import { Schema, model, models, Document } from 'mongoose';

export interface IGlyph {
  char: string;
  matrix: number[][];
  [key: string]: any;
}

export interface IFontDocument extends Document {
  uid: string;
  name: string;
  slug: string;
  authorUid: string;
  gridSize: {
    width: number;
    height: number;
  };
  glyphs: IGlyph[];
  status: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  dates: {
    createdAt: Date;
    updatedAt: Date;
  };
}

// 🪡 Définition propre du sous-schéma pour les glyphes
const GlyphSchema = new Schema({
  char: { type: String, required: true },
  matrix: { type: [[Number]], required: true }
}, { _id: false });

const FontSchema = new Schema<IFontDocument>({
  uid: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  authorUid: { 
    type: String, 
    required: true, 
    index: true 
  },
  gridSize: {
    width: { type: Number, required: true, default: 8 },
    height: { type: Number, required: true, default: 8 }
  },
  glyphs: { 
    type: [GlyphSchema], 
    default: [] 
  },
  status: { 
    type: String, 
    enum: ['DRAFT', 'RELEASED', 'ARCHIVED'], 
    default: 'DRAFT',
    index: true 
  },
  dates: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: false,
  collection: 'fonts'
});

export const FontModel = models.Font || model<IFontDocument>('Font', FontSchema);
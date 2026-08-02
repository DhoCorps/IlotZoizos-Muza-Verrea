import mongoose, { Schema, Document } from 'mongoose';

export interface ILetterSpriteDocument extends Document {
  uid: string;
  name: string;
  slug: string; // 🪡
  authorUid: string;
  gridSize: { width: number; height: number };
  glyphs: Array<{
    character: string;
    unicodeCodePoint?: string;
    frames: Array<{
      frameIndex: number;
      width: number;
      height: number;
      pixels: string[];
    }>;
    advanceWidth: number;
  }>;
  status: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  createdAt: Date;
}

const LetterSpriteSchema = new Schema<ILetterSpriteDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡
  authorUid: { type: String, required: true, index: true },
  gridSize: {
    width: { type: Number, default: 16 },
    height: { type: Number, default: 16 },
  },
  glyphs: [{
    character: { type: String, required: true },
    unicodeCodePoint: { type: String },
    frames: [{
      frameIndex: { type: Number, required: true },
      width: { type: Number, default: 16 },
      height: { type: Number, default: 16 },
      pixels: [{ type: String }]
    }],
    advanceWidth: { type: Number, default: 16 }
  }],
  status: { type: String, enum: ['DRAFT', 'RELEASED', 'ARCHIVED'], default: 'DRAFT' }
}, { timestamps: true });

export const LetterSpriteModel = mongoose.models.LetterSprite || mongoose.model<ILetterSpriteDocument>('LetterSprite', LetterSpriteSchema);
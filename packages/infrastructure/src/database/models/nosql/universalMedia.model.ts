// infrastructure/src/database/models/nosql/universalMedia.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { UniversalMediaType } from '@ilot/types';

export interface IUniversalMediaDocument extends Document {
  mediaId: string;
  sourceApp: UniversalMediaType;
  ownerUid: string;
  ownerSlug: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  priceCents: number;
  metadata: Record<string, any>;
  consentForShowcase: boolean;
  consentForMusicSync: boolean;
  createdAt: Date;
}

const UniversalMediaSchema = new Schema<IUniversalMediaDocument>({
  mediaId: { type: String, required: true, unique: true, index: true },
  sourceApp: { 
    type: String, 
    enum: ['PARTITA', 'LETRIN', 'ABYSS', 'DHO', 'GALLERY', 'SPRITE'], 
    required: true,
    index: true 
  },
  ownerUid: { type: String, required: true, index: true },
  ownerSlug: { type: String, required: true },
  title: { type: String, required: true },
  mediaUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  priceCents: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  consentForShowcase: { type: Boolean, default: false, index: true },
  consentForMusicSync: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
});

export const UniversalMediaModel: Model<IUniversalMediaDocument> = 
  mongoose.models.UniversalMedia || mongoose.model<IUniversalMediaDocument>('UniversalMedia', UniversalMediaSchema);
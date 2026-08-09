import mongoose, { Schema, Document, Model } from 'mongoose';
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
  creatorUid: { type: String, required: true, index: true },
  creatorSlug: { type: String, required: true },
  permissions: {
    allowRadio: { type: Boolean, default: true },
    allowBlindTest: { type: Boolean, default: true },
    allowShowcase: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now }
});

export const SampleModel: Model<ISampleDocument> =
  mongoose.models.Sample || mongoose.model<ISampleDocument>('Sample', SampleSchema);
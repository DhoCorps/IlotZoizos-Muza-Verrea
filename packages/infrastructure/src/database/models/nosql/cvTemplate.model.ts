// apps/hub-central/models/cvTemplate.model.ts
import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

export interface ICVTemplateDocument extends Document {
  uid: string;
  slug: string; // 🌟 Ajout du slug
  authorUid: string;
  authorName: string;
  title: string;
  description: string;
  priceShards: number;
  barterAccepted: boolean;
  letrinFontFamily: string;
  blocks: any[];
  createdAt: Date;
}

const CVTemplateSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🌟 Indexé pour la rapidité
  authorUid: { type: String, required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  priceShards: { type: Number, default: 0 },
  barterAccepted: { type: Boolean, default: true },
  letrinFontFamily: { type: String, default: 'sans' },
  blocks: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const CVTemplateModel: Model<ICVTemplateDocument> = 
  mongoose.models.CVTemplate || mongoose.model<ICVTemplateDocument>('CVTemplate', CVTemplateSchema);
// apps/hub-central/models/cvTemplate.model.ts
import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

const { Schema } = mongoose;

import { connectToDatabase } from '@ilot/infrastructure'; // Ajuste le chemin si nécessaire

// ⚡ FORCE L'INITIALISATION DE LA CONNEXION
connectToDatabase().catch((err: any) => console.error("Erreur d'auto-connexion Mongoose (CVTemplate):", err));

export interface ICVTemplateDocument extends Document {
  uid: string;
  slug: string;
  authorUid: string;
  authorName: string;
  title: string;
  description: string;
  priceShards: number;
  barterAccepted: boolean;
  letrinFontFamily: string;
  blocks: any[];
  createdAt: Date;
  updatedAt: Date;
}

// Plus de typage explicite `: Schema<...>`, TypeScript l'infère tout seul à partir de l'objet
const CVTemplateSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true },
  authorUid: { type: String, required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  priceShards: { type: Number, default: 0 },
  barterAccepted: { type: Boolean, default: true },
  letrinFontFamily: { type: String, default: 'sans' },
  blocks: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const CVTemplateModel: Model<ICVTemplateDocument> = 
  mongoose.models.CVTemplate || mongoose.model<ICVTemplateDocument>('CVTemplate', CVTemplateSchema);
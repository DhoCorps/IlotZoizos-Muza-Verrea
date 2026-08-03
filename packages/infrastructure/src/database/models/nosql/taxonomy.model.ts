// apps/hub-central/modules/taxonomy/taxonomy.model.ts (ou dans ton package d'infrastructure)
import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxonomy extends Document {
  uid: string;
  name: string;
  domain: 'MUSIC' | 'GRAPHIC' | 'VIDEO' | 'CINEMA' | 'PHYSICAL_GOODS' | 'LORE' | 'FONT' | 'OTHER';
  type: 'STYLE' | 'CATEGORY';
  creatorUid: string;
  isCustom: boolean;
  createdAt: Date;
}

const TaxonomySchema = new Schema<ITaxonomy>({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  domain: { 
    type: String, 
    enum: ['MUSIC', 'GRAPHIC', 'VIDEO', 'CINEMA', 'PHYSICAL_GOODS', 'LORE', 'FONT', 'OTHER'], 
    required: true 
  },
  type: { type: String, enum: ['STYLE', 'CATEGORY'], required: true },
  creatorUid: { type: String, required: true },
  isCustom: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const TaxonomyModel = mongoose.models.Taxonomy || mongoose.model<ITaxonomy>('Taxonomy', TaxonomySchema);
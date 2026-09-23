import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import { IDemopraxicRecord, SanctionCategorySchema } from '@ilot/types';

export interface IDemopraxicDocument extends Omit<IDemopraxicRecord, 'uid' | 'createdAt' | 'updatedAt'>, Document {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
}

const DemopraxySchema = new mongoose.Schema<IDemopraxicDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  userIdentifier: { type: String, required: true, index: true },
  actorUid: { type: String, required: true, index: true },
  metrics: {
    systemicHatredScore: { type: Number, required: true, min: 0, max: 10 },
    recurrenceCount: { type: Number, required: true, min: 0 },
    recalibrationCapacity: { type: Number, required: true, min: 0.1, max: 10 },
    collectiveResonance: { type: Number, required: true },
    computedEx: { type: Number, required: true }
  },
  sanctionCategory: {
    type: String,
    enum: SanctionCategorySchema.options,
    required: true,
    default: 'SYSTEMIC_HATRED'
  },
  tags: [{ type: String, trim: true }],
  isExcluded: { type: Boolean, required: true, default: false },
  actionMessage: { type: String, required: true }
}, {
  timestamps: true,
  collection: 'demopraxy_records'
});

// 🚀 Index composite de performance pour trier et paginer rapidement par date et catégorie (Zéro doublon d'index)
DemopraxySchema.index({ createdAt: -1, sanctionCategory: 1 });
DemopraxySchema.index({ tags: 1 });

export const DemopraxyModel: Model<IDemopraxicDocument> =
  mongoose.models.Demopraxy || mongoose.model<IDemopraxicDocument>('Demopraxy', DemopraxySchema);
import mongoose, { Schema, Document } from 'mongoose';

export type AwardCategory = 'GLORY' | 'CHAOS' | 'MYSTIC' | 'CUSTOM';

export interface ICanopyAwardDocument extends Document {
  yearMonth: string; // Ex: '2026-08'
  awardKey: string;  // Clé unique paramérable (ex: 'MOST_COMMENTED', 'BEST_CHAOS_ARTIST', etc.)
  title: string;     // Intitulé affichable (ex: "Le Grand Semeur de Chaos")
  recipientUid: string; // L'oiseau récompensé
  category: AwardCategory;
  loreDescription?: string; // Petite note poétique ou humoristique
  metadata?: Record<string, any>; // Données libres et paramérables pour le trophée
  createdAt: Date;
}

const canopyAwardSchema = new Schema<ICanopyAwardDocument>({
  yearMonth: { type: String, required: true, index: true },
  awardKey: { type: String, required: true, index: true },
  title: { type: String, required: true },
  recipientUid: { type: String, required: true, index: true },
  category: { 
    type: String, 
    enum: ['GLORY', 'CHAOS', 'MYSTIC', 'CUSTOM'], 
    default: 'GLORY' 
  },
  loreDescription: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'canopy_awards'
});

// Index composé pour retrouver rapidement les prix d'un cycle ou d'un oiseau
canopyAwardSchema.index({ yearMonth: 1, awardKey: 1 }, { unique: true });

export const CanopyAwardModel = mongoose.models.CanopyAward || mongoose.model<ICanopyAwardDocument>('CanopyAward', canopyAwardSchema);
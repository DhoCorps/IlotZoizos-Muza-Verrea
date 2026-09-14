// infrastructure/src/database/models/nosql/reward.model.ts
// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;
export interface IRewardEntry extends Document {
  ownerUid: string;
  type: 'TOP_SELLER' | 'TOP_BUYER' | 'MOST_COMMENTED' | 'MOST_REACTIVE';
  month: string;       // "2026-08"
  isTradable: boolean; // Si l'oiseau peut l'échanger
  isConsumed: boolean; // Si le jeu Renewall a déjà utilisé cette récompense
  metadata: Record<string, any>; // Ex: boost spécifique pour Renewall
  createdAt: Date;
}

const RewardSchema = new Schema<IRewardEntry>({
  ownerUid: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['TOP_SELLER', 'TOP_BUYER', 'MOST_COMMENTED', 'MOST_REACTIVE'], 
    required: true 
  },
  month: { type: String, required: true, index: true },
  isTradable: { type: Boolean, default: true },
  isConsumed: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

// Export exhaustif sous les deux dénominations pour éviter toute rupture d'import
export const RewardEntryModel: Model<IRewardEntry> = 
  mongoose.models.RewardEntry || mongoose.models.Reward || mongoose.model<IRewardEntry>('Reward', RewardSchema);

export const RewardModel = RewardEntryModel;
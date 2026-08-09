// packages/infrastructure/src/database/models/nosql/reaction.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction extends Document {
  reactionUid: string;
  targetEntityUid: string;
  targetLabel: string;
  senderUid: string;       // L'oiseau qui réagit
  emoji: string;           // Le caractère ou code de l'emoji
  createdAt: Date;
}

const ReactionSchema = new Schema<IReaction>({
  reactionUid: { type: String, required: true, unique: true },
  targetEntityUid: { type: String, required: true, index: true },
  targetLabel: { type: String, required: true },
  senderUid: { type: String, required: true, index: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

export const ReactionModel = mongoose.models.Reaction || mongoose.model<IReaction>('Reaction', ReactionSchema);
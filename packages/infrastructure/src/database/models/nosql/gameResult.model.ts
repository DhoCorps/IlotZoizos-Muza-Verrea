import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IGameResult extends Document {
  username: string;
  gameType: 'KoOonTreeZ' | 'WikiOracle';
  score: number;
  finalScore: number;
  trophies: string[]; // Liste des IDs ou slugs de trophées
  maxStreak: number;
  createdAt: Date;
}

const GameResultSchema = new Schema({
  username: { type: String, required: true },
  gameType: { type: String, required: true },
  score: { type: Number, required: true },
  finalScore: { type: Number, required: true },
  trophies: [String],
  maxStreak: Number,
  createdAt: { type: Date, default: Date.now }
});

export const GameResultModel = mongoose.models.GameResult || mongoose.model<IGameResult>('GameResult', GameResultSchema);
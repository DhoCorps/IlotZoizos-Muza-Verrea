// packages/infrastructure/src/database/models/nosql/gameHistory.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { GameMatchLog } from '../../../../../types/src/core/gameHistory.types';

export interface GameHistoryDocument extends GameMatchLog, Document {}

const PlayerStatsSchema = new Schema({
    uid: { type: String, required: true, index: true }, // Indexé pour requêter rapidement l'historique d'un joueur
    pseudo: { type: String, required: true },
    score: { type: Number, required: true, default: 0 },
    isWinner: { type: Boolean, required: true },
    specificStats: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const GameHistorySchema = new Schema({
    gameType: { 
        type: String, 
        required: true, 
        enum: ['AtomikKFardE', 'CrazyMorpion', 'PlumZee', 'SoonArt', 'CineMax', 'GalakTK'],
        index: true // Indexé pour faire des classements par jeu
    },
    roomId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true, default: Date.now },
    durationSeconds: { type: Number, required: true },
    players: { type: [PlayerStatsSchema], required: true },
    matchMetadata: { type: Schema.Types.Mixed, default: {} }
}, { 
    timestamps: true 
});

// Empêche la recompilation du modèle lors du Hot-Reload de Next.js
export const GameHistoryModel: Model<GameHistoryDocument> = 
    mongoose.models.GameHistory || mongoose.model<GameHistoryDocument>('GameHistory', GameHistorySchema);
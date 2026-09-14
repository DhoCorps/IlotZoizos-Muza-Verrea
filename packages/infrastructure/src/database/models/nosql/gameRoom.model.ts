import { Schema, model, models, Document } from 'mongoose';

export interface IGameRoomDocument extends Document {
  roomId: string;
  gameId: string;
  mode: 'SOLO' | 'MULTIPLAYER';
  wagerAmount: number;
  wagerCurrency: string;
  creatorUid: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'ABORTED';
  participants: string[];
  createdAt: Date;
}

const GameRoomSchema = new Schema<IGameRoomDocument>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    gameId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['SOLO', 'MULTIPLAYER'], required: true, default: 'SOLO' },
    wagerAmount: { type: Number, required: true, default: 0, min: 0 },
    wagerCurrency: { type: String, required: true, default: 'DHO' },
    creatorUid: { type: String, required: true, index: true },
    status: { 
      type: String, 
      enum: ['WAITING', 'IN_PROGRESS', 'FINISHED', 'ABORTED'], 
      required: true, 
      default: 'WAITING' 
    },
    participants: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const GameRoomModel = models.GameRoom || model<IGameRoomDocument>('GameRoom', GameRoomSchema);
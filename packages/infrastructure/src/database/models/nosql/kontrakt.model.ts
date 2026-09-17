import mongoose from 'mongoose';
import type { Document } from 'mongoose';

// L'interface Mongoose enrichie pour l'infrastructure
export interface IKonTraKtDocument extends Document {
  creatorId: string;
  gameId: string;
  gameMode: string; // Permet d'accueillir n'importe quel string valide ou enum partagé
  difficulty: 'Initiate' | 'Artisan' | 'Maestro';
  wagerAmount: number;
  wagerCurrency: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  targetDhOValue: number;
  status: 'pending' | 'accepted' | 'resolved' | 'expired';
  expiresAt: Date;
  acceptedById?: string;
  coverCurrency?: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  coverAmount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const KonTraKtSchema = new mongoose.Schema(
  {
    creatorId: { type: String, required: true },
    gameId: { type: String, required: true },
    gameMode: { 
      type: String, 
      required: true 
    },
    difficulty: { 
      type: String, 
      enum: ['Initiate', 'Artisan', 'Maestro'], 
      required: true 
    },
    wagerAmount: { 
      type: Number, 
      required: true,
      min: [0.01, 'La mise doit être strictement positive']
    },
    wagerCurrency: { 
      type: String, 
      enum: ['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes'], 
      required: true 
    },
    targetDhOValue: { 
      type: Number, 
      required: true,
      min: [0.01, 'La valeur en DhÔ doit être strictement positive'] 
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'resolved', 'expired'], 
      default: 'pending' 
    },
    expiresAt: { 
      type: Date, 
      required: true,
      // L'Index TTL natif de MongoDB
      expires: 0 
    },
    acceptedById: { type: String },
    coverCurrency: { 
      type: String, 
      enum: ['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes'] 
    },
    coverAmount: { type: Number, min: [0, 'La couverture ne peut être négative'] }
  },
  { timestamps: true }
);

// Empêche la recompilation du modèle lors du hot-reload de Next.js
export const KonTraKt = (mongoose.models.KonTraKt as mongoose.Model<IKonTraKtDocument>) || mongoose.model<IKonTraKtDocument>('KonTraKt', KonTraKtSchema);
import mongoose, { Schema, Document } from 'mongoose';

// L'interface pour le typage TypeScript dans le modèle
export interface IKonTraKt extends Document {
  creatorId: string;
  gameId: string;
  gameMode: 'solo' | 'multiplayer';
  difficulty: 'Initiate' | 'Artisan' | 'Maestro';
  wagerAmount: number;
  wagerCurrency: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  targetDhOValue: number;
  status: 'pending' | 'accepted' | 'resolved' | 'expired';
  expiresAt: Date;
  acceptedById?: string;
  coverCurrency?: 'plumes' | 'totamtoes' | 'parchemins' | 'vinyles' | 'sampleNotes';
  coverAmount?: number;
}

const KonTraKtSchema: Schema = new Schema(
  {
    creatorId: { type: String, required: true },
    gameId: { type: String, required: true },
    gameMode: { 
      type: String, 
      enum: ['solo', 'multiplayer'], 
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
      // C'EST ICI QUE LA MAGIE OPÈRE : L'Index TTL natif de MongoDB
      expires: 0 
    },
    acceptedById: { type: String },
    coverCurrency: { 
      type: String, 
      enum: ['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes'] 
    },
    coverAmount: { type: Number, min: [0, 'La couverture ne peut être négative'] }
  },
  { timestamps: true } // Ajoute automatiquement createdAt et updatedAt
);

// Empêche la recompilation du modèle lors du hot-reload de Next.js
export const KonTraKt = mongoose.models.KonTraKt || mongoose.model<IKonTraKt>('KonTraKt', KonTraKtSchema);
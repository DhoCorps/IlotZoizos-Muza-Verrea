// infrastructure/src/database/models/nosql/oiseauInventory.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOiseauInventoryDocument extends Document {
  userUid: string;
  
  // Les Ressources de la Canopée
  parchemins: number;    // Abyss-Blog (Écriture)
  plumes: number;        // Letr'in (Design/Pixels)
  vinyles: number;       // Partita (Musique/Ambiance)
  sampleNotes: number;   // Partage & Générosité
  totamtoes: number;     // Mini-Jeux de la plateforme
  
  // Niveau de l'Alvéole (Le lieu de stockage : 1 = Coffre, 2 = Cachette, 3 = Entrepôt, 4 = Caverne)
  alveoleLevel: number;
  
  // Outils et extensions débloqués (ex: 'bucket', 'rectangle', 'sampler_track_5', etc.)
  unlockedUnlocks: string[];
  
  updatedAt: Date;
}

const OiseauInventorySchema = new Schema<IOiseauInventoryDocument>({
  userUid: { type: String, required: true, unique: true, index: true },
  
  parchemins: { type: Number, default: 0, min: 0 },
  plumes: { type: Number, default: 0, min: 0 },
  vinyles: { type: Number, default: 0, min: 0 },
  sampleNotes: { type: Number, default: 0, min: 0 },
  totamtoes: { type: Number, default: 0, min: 0 },
  
  alveoleLevel: { type: Number, default: 1, min: 1, max: 4 }, // 1: Coffre, 2: Cachette, 3: Entrepôt, 4: Caverne
  unlockedUnlocks: { type: [String], default: [] },
  
  updatedAt: { type: Date, default: Date.now }
});

export const OiseauInventoryModel: Model<IOiseauInventoryDocument> =
  mongoose.models.OiseauInventory || mongoose.model<IOiseauInventoryDocument>('OiseauInventory', OiseauInventorySchema);
// apps/infrastructure/src/database/models/nosql/user.model.neo.ts
import mongoose, { Model } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IOiseau } from "@ilot/types"; 
import { connectToDatabase } from '../../mongoose';

// ⚡ Réveil de la Silice
connectToDatabase().catch((err: any) => console.error("MongoDB Message Error:", err));

const UserSchema = new Schema({
  // --- 🌉 LE PONT NEO4J ---
  uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },

  // --- 🕊️ L'ESSENCE DE L'OISEAU (Harmonisé) ---
  pseudo: { type: String, required: true, unique: true, trim: true }, // Remplace name/prenom
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, select: false },
  password: { type: String, select: false },
  
  // L'Aura remplace les rôles figés : c'est un tableau de pouvoirs
  capabilities: { type: [String], default: [] }, 
  
  // La Signature visuelle et textuelle [cite: 2025-06-14]
  signature: { type: String, default: "<(:<" }, 
  frequenceHEX: { type: String, default: '#8b9dc3' }, // Gris bleuté par défaut [cite: 2026-03-27]

  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive', 'banned'], 
    default: 'pending' 
  },
  
  // --- 📈 ÉVOLUTION & RÉSILIENCE ---
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  mood: { type: String, default: '😐' },

  // --- 🧠 MODULES ILOT-ZOIZOS (Maintenus) [cite: 2026-02-11] ---
  moderation: {
    reportCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }
  },
  collectiveData: {
    contributionScore: { type: Number, default: 0 }
  },
  wellbeing: {
    mentalLoadScore: { type: Number, min: 0, max: 100, default: 0 },
    lastCheckIn: { type: Date }
  }
}, {
  timestamps: true 
});

// Exportation sécurisée pour le Nexus
export const UserModelNeo = (mongoose.models.User as Model<IOiseau>) || mongoose.model<IOiseau>('User', UserSchema);
// apps/infrastructure/src/database/models/nosql/user.model.neo.ts
import mongoose from 'mongoose'; 
import type { Model, Document } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IOiseau } from "@ilot/types"; 
import { connectToDatabase } from '../../mongoose';

// ⚡ Réveil de la Silice
connectToDatabase().catch((err: any) => console.error("MongoDB Message Error:", err));

// 🚀 CRÉATION DE L'INTERFACE SPÉCIFIQUE AU PONT NEO4J
// On étend l'Oiseau moderne pour y ajouter les modules RPG et de Modération hérités
export interface INeoUser extends Omit<IOiseau, 'status'>, Document {
  status: 'pending' | 'active' | 'inactive' | 'banned';
  level: number;
  xp: number;
  mood: string;
  moderation: {
    reportCount: number;
    isFlagged: boolean;
  };
  collectiveData: {
    contributionScore: number;
  };
  wellbeing: {
    mentalLoadScore: number;
    lastCheckIn?: Date;
  };
}

const UserSchema = new Schema({
  // --- 🌉 LE PONT NEO4J ---
  uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },

  // --- 🕊️ L'ESSENCE DE L'OISEAU (Harmonisé) ---
  pseudo: { type: String, required: true, unique: true, trim: true }, // Remplace name/prenom
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, select: false },
  password: { type: String, select: false },
  
  // L'Aura remplace les rôles figés : c'est un tableau de pouvoirs (Critique pour le Matchmaking Graphe !)
  capabilities: { type: [String], default: [] }, 
  
  // La Signature visuelle et textuelle
  signature: { type: String, default: "<(:<" }, 
  frequenceHEX: { type: String, default: '#8b9dc3' }, // Gris bleuté par défaut

  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive', 'banned'], 
    default: 'pending' 
  },

  // 💼 LE PROFIL RH (Réduit pour le Matchmaking Rapide du Graphe)
  cvProfile: {
    professionalStatus: { type: String, default: 'EMPLOYEE' },
    remotePreference: { type: String, default: 'FLEXIBLE' },
    freelanceDailyRateCents: { type: Number },
    // Les compétences (Aura) gèrent le reste du match !
  },
  
  // --- 📈 ÉVOLUTION & RÉSILIENCE ---
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  mood: { type: String, default: '😐' },

  // --- 🧠 MODULES ILOT-ZOIZOS (Maintenus) ---
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

// 🚀 Exportation sécurisée avec la nouvelle interface typée
export const UserModelNeo = (mongoose.models.User as Model<INeoUser>) || mongoose.model<INeoUser>('User', UserSchema);
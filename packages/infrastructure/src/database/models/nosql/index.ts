import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
// Ligne 3 : Remonte jusqu'au package core pour choper User
import { IUser } from "@ilot/types";

// Ligne 4 : Remonte jusqu'au dossier lib pour la base de données
import { connectToDatabase } from '../../mongoose';

// ⚡ On réveille MongoDB
connectToDatabase().catch((err: any) => console.error("MongoDB Message Error:", err));

const UserSchema = new Schema({
  // --- 🌉 LE PONT NEO4J ---
  uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },

  // --- 👤 INFOS DE BASE ---
  name: { type: String, required: true },
  prenom: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false }, // Vital pour ton Auth classique
  avatarUrl: { type: String, default: '/assets/avatars/default.png' },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive', 'banned'], 
    default: 'pending' 
  },
  
  // --- 🎮 GAMIFICATION ---
  jobTitle: { type: String },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  mood: { type: String, default: '😐' },

  // --- 🔐 SÉCURITÉ & ROLES ---
  // Excellent : on utilise maintenant des ObjectIds vers la collection Role !
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],

  // --- 🧠 MODULES L-ILOT-ZOIZOS ---
  moderation: {
    reportCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false }
  },
  collectiveData: {
    optIn: { type: Boolean, default: true },
    contributionScore: { type: Number, default: 0 }
  },
  wellbeing: {
    mentalLoadScore: { type: Number, min: 0, max: 100, default: 0 },
    lastCheckIn: { type: Date }
  }
}, {
  timestamps: true 
});

// Le fix Next.js sécurisé
export const UserModelNeo = (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
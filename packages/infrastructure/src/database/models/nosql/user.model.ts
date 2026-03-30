import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { IUser } from "@ilot/types";

export interface UserDocument extends Omit<IUser, '_id'>, Document { 
  _id: mongoose.Types.ObjectId; 
  synapseId?: string;       
  signature?: string;       
  currentMode: 'standard' | 'ghost'; 
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  lastActive: Date;
  isOnline: boolean;
  isOpenToInvitations: boolean;
  airplaneMode: boolean;
  teams: string[]; 
  projects: string[];
}

const UserSchema = new Schema<UserDocument>(
  {
    // --- 🌉 LE PONT NEO4J ---
    uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },
    synapseId: { type: String, index: true }, 

    // --- 👤 INFOS DE BASE ---
    username: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String }, // Optionnel, pour un affichage plus humain
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    avatar: { type: String, default: '/assets/avatars/default.png' },
    signature: { type: String },

    // --- 🚦 STATUTS & CONNEXIONS ---
    status: { type: String, enum: ['pending', 'active', 'inactive', 'banned'], default: 'pending' },
    currentMode: { type: String, enum: ['standard', 'ghost'], default: 'standard' },
    isOnline: { type: Boolean, default: false },
    airplaneMode: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    isOpenToInvitations: { type : Boolean, default: true},
    // --- 🔐 SÉCURITÉ & ROLES ---
    roles: { type: [String], default: ['MEMBER'] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },

    // --- 🎮 GAMIFICATION ---
    jobTitle: { type: String },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    mood: { type: String, default: '😐' },

    // --- 🏗️ ÉQUIPES & PROJETS ---
    teams: [{ type: String }],
    projects: [{ type: String }],

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
  },
  
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: (_, ret: any) => { 
        delete ret._id; 
        delete ret.__v;
        delete ret.password;
        return ret;
      } 
    }
  }
);

// Le fix Next.js sécurisé pour le Hot Reload
export const UserModel = (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>('User', UserSchema);
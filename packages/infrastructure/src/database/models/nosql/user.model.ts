import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { IUser } from "@ilot/types"; // 👈 L'interface étendue
import { IRole } from "@ilot/types";
/**
 * 👤 USER DOCUMENT
 * Fusion de l'interface Zod et des propriétés système de Mongoose.
 */
export interface UserDocument extends IUser, Document { 
  _id: mongoose.Types.ObjectId; 
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    // --- 🌉 LE PONT NEO4J ---
    uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },
    synapseId: { type: String, index: true }, 

    // --- 👤 INFOS DE BASE & SIGNATURE ---
    username: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String }, 
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    signature: { type: String },

    // --- 📸 IDENTITÉ VISUELLE ---
    profilePicture: { type: String },
    avatarUrl: { type: String, default: '/assets/avatars/default.png' },
    coverPicture: { type: String },

    // --- 📜 DOSSIER D'IDENTITÉ (CV & Bio) ---
    identity: {
      cvUrl: { type: String },
      biography: { type: String },
      location: { type: String },
      links: [{
        label: { type: String },
        url: { type: String }
      }]
    },

    // --- 🎮 FICHE DE PERSONNAGE (Gamification) ---
    characterSheet: {
      jobTitle: { type: String },
      level: { type: Number, default: 1 },
      xp: { type: Number, default: 0 },
      mood: { type: String, default: '😐' },
      skills: [{ type: String }],
      alignment: { 
        type: String, 
        enum: ['lawfull', 'neutral', 'chaotic', 'good', 'evil'] 
      }
    },

    // --- 🚦 STATUTS & CONNEXIONS ---
    status: { 
      type: String, 
      enum: ['pending', 'active', 'inactive', 'banned'], 
      default: 'pending' 
    },
    currentMode: { 
      type: String, 
      enum: ['standard', 'ghost'], 
      default: 'standard' 
    },
    isOnline: { type: Boolean, default: false },
    airplaneMode: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    isOpenToInvitations: { type: Boolean, default: true },

    // --- 🔐 SÉCURITÉ & ROLES ---
    roles: [{
    type: Schema.Types.ObjectId,
    ref: 'Role' 
    }],
    role: { type: String, default: 'MEMBRE' },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },

    // --- 🏗️ ÉCOSYSTÈME ---
    // Utilisation d'ObjectIDs pour les relations Mongo natives
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],

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

export const UserModel = (mongoose.models.User as Model<UserDocument>) || 
                         mongoose.model<UserDocument>('User', UserSchema);
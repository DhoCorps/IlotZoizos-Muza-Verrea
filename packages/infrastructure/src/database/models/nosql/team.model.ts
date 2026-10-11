// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model, Types } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { ITeam } from '@ilot/types'; // 👈 Source de vérité unique issue de Zod purifié

/**
 * 🏗️ TEAM DOCUMENT
 * On étend l'interface ITeam (Zod purifié) avec les propriétés système de Mongoose.
 */
export interface ITeamDocument extends Omit<ITeam, '_id' | 'dates' | 'members' | 'invitations' | 'documents' | 'collectiveHealth'>, Document {
  _id: Types.ObjectId; 
  
  // 🪡 Suture : Mongoose gère les dates nativement, on override les types Zod (String/Date)
  members: Array<{
    uid: string;
    capabilities: string[];
    contributionPoints: number;
    joinedAt: Date;
  }>;
  invitations: Array<{
    uid: string;
    targetUid: string;
    inviterUid: string;
    status: string;
    capabilities: string[];
    invitedAt: Date;
  }>;
  documents: Array<{
    uid: string;
    name: string;
    label: string;
    url: string;
    mimeType: string;
    createdAt: Date;
  }>;
  collectiveHealth: {
    lastPulseCheck?: Date;
  };
  dates: {
    createdAt?: Date;
    updatedAt?: Date;
  };
}

const TeamSchema = new Schema<ITeamDocument>(
  {
    // --- 🌉 LE PONT NEO4J (Le Graphe Muet) ---
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    },

    // --- 🏷️ IDENTITÉ (L'Archive Concrète) ---
    name: { type: String, required: true, unique: false, trim: true, index: true },
    description: { type: String, maxlength: 500 },
    
    // --- 🕸️ STRUCTURE & HIÉRARCHIE ---
    category: { 
      type: String, 
      enum: ['SOCIAL', 'SYSTEM', 'DAWN'], // 🩸 Les boîtes sociologiques ont disparu
      default: 'SOCIAL' 
    },
    frequency: { // 🩸 NOUVEAU : La Vibration qui remplace "themeColor"
      type: String, 
      default: '#8b9dc3', // Suture : Aligné avec le schéma Zod (Gris bleuté)
      validate: {
        validator: function(v: string) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: props => `${props.value} n'est pas une couleur HEX valide!`
      }
    },
    ownerUid: { type: String, required: true, index: true }, 
    leaderUid: { type: String, index: true },                
    parentId: { type: String, default: null, index: true },
    isPrivate: { type: Boolean, default: true },

    // --- ⚖️ GOUVERNANCE ---
    governance: {
      votingSystem: { 
        type: String, 
        enum: ['DEMOCRATIC', 'AUTOCRATIC', 'CONSENSUS'], 
        default: 'DEMOCRATIC' 
      },
      allowMemberInvite: { type: Boolean, default: true }
    },

    // --- ⚙️ RÉGLAGES DE L'HORLOGERIE ---
    settings: {
      isGlobalReducedSpeed: { type: Boolean, default: false },
      allowSearch: { type: Boolean, default: true },
      defaultLocale: { type: String, default: 'fr' }
    },

    // --- 🧠 SANTÉ COLLECTIVE & MODÉRATION ---
    collectiveHealth: {
      lastPulseCheck: Date
    },

    moderation: {
      isFlagged: { type: Boolean, default: false },
      reportCount: { type: Number, default: 0 }
    },

    // --- 👥 RELATIONS (Silice) ---
    invitations: [{
      uid: { type: String, required: true },
      targetUid: { type: String, required: true },
      inviterUid: { type: String, required: true },
      status: { type: String, enum: ['PENDING', 'ACCEPTED', 'DECLINED'], default: 'PENDING' },
      capabilities: [{ type: String }],
      invitedAt: { type: Date, default: Date.now }
    }],

    members: [{
      uid: { type: String, required: true },
      capabilities: [{ type: String }],
      contributionPoints: { type: Number, default: 0 },
      joinedAt: { type: Date, default: Date.now }
    }],

    documents: [{
      uid: String,
      name: String,
      label: String,
      url: String,
      mimeType: String,
      createdAt: { type: Date, default: Date.now }
    }],

    // --- ⏱️ DATES ---
    dates: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }

  },
   
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: (_, ret: any) => { 
        delete ret._id; 
        delete ret.__v;
        return ret;
      } 
    }
  }
);

export const TeamModel = (mongoose.models.Team as Model<ITeamDocument>) || 
                         mongoose.model<ITeamDocument>('Team', TeamSchema);
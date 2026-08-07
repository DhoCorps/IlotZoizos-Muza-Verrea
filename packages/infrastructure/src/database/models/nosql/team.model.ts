import mongoose from 'mongoose'; 
import type { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { ITeam } from '@ilot/types'; // 👈 Source de vérité unique issue de Zod purifié

/**
 * 🏗️ TEAM DOCUMENT
 * On étend l'interface ITeam (Zod purifié) avec les propriétés système de Mongoose.
 */
export interface ITeamDocument extends Omit<ITeam, '_id'>, Document {
  _id: Types.ObjectId; 
  createdAt: Date;
  updatedAt: Date;
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
      default: '#2A3B4C',
      validate: {
        validator: function(v: string) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: props => `${props.value} n'est pas une couleur HEX valide!`
      }
    },
    ownerUid: { type: String, required: true, index: true }, // ✅ Changé ownerId -> ownerUid
    leaderUid: { type: String, index: true },                // ✅ Changé leaderId -> leaderUid
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
      allowSearch: { type: Boolean, default: true }
    },

    // --- 🧠 SANTÉ COLLECTIVE & MODÉRATION ---
    collectiveHealth: {
      lastPulseCheck: Date
    },

    moderation: {
      isFlagged: { type: Boolean, default: false },
      reportCount: { type: Number, default: 0 }
    },

    documents: [{
      uid: String,
      name: String,
      label: String,
      url: String,
      mimeType: String,
      createdAt: { type: Date, default: Date.now }
    }]

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
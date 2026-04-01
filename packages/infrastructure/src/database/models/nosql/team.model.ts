import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ITeam } from '@ilot/types'; // 👈 Source de vérité unique issue de Zod

/**
 * 🏗️ TEAM DOCUMENT
 * On étend l'interface ITeam (Zod) avec les propriétés système de Mongoose.
 */
export interface ITeamDocument extends Omit<ITeam, '_id'>, Document {
  _id: Types.ObjectId; 
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeamDocument>(
  {
    // --- 🌉 LE PONT NEO4J ---
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    }, //

    // --- 🏷️ IDENTITÉ SUPRÊME ---
    name: { type: String, required: true, unique: true, trim: true, index: true }, //
    tag: { type: String, uppercase: true, trim: true }, // ex: [ZOIZO]
    description: { type: String, maxlength: 500 }, //
    slogan: { type: String, maxlength: 100 }, //
    avatarUrl: { type: String, default: '' }, //
    bannerUrl: { type: String, default: '' }, //
    
    // --- 🕸️ STRUCTURE & HIÉRARCHIE ---
    category: { 
      type: String, 
      enum: ['PROFESSIONAL', 'ESPORT', 'COLLECTIVE', 'SOCIAL', 'EDUCATION', 'DAWN'], 
      default: 'SOCIAL' 
    }, //
    ownerId: { type: String, required: true, index: true }, //
    leaderId: { type: String, index: true }, //
    parentId: { type: String, default: null, index: true }, //
    isPrivate: { type: Boolean, default: true }, //

    // --- 💼 CONTEXTE PROFESSIONNEL ---
    professional: {
      industry: String,
      companySize: String,
      department: String,
      budget: {
        allocated: { type: Number, default: 0 },
        currency: { type: String, default: 'EUR' }
      },
      tools: [String]
    }, //

    // --- 🎮 CONTEXTE E-SPORT ---
    esport: {
      mainGame: String,
      division: String,
      rank: String,
      achievements: [{
        title: String,
        date: Date
      }],
      matchHistory: [String]
    }, //

    // --- 🛒 CONTEXTE ACHAT COLLECTIF ---
    collectiveBuy: {
      targetItem: String,
      targetPrice: Number,
      currentPool: { type: Number, default: 0 },
      minParticipants: { type: Number, default: 1 },
      deadline: Date,
      status: { 
        type: String, 
        enum: ['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED'], 
        default: 'OPEN' 
      }
    }, //

    // --- 🎯 OBJECTIFS & RESSOURCES ---
    milestones: [{
      label: String,
      isCompleted: { type: Boolean, default: false },
      dueDate: Date
    }], //
    
    resources: [{
      label: String,
      url: String,
      type: { type: String, enum: ['DOC', 'LINK', 'TOOL', 'FINANCE'] }
    }], //

    // --- ⚖️ GOUVERNANCE ---
    governance: {
      votingSystem: { 
        type: String, 
        enum: ['DEMOCRATIC', 'AUTOCRATIC', 'CONSENSUS'], 
        default: 'DEMOCRATIC' 
      },
      allowMemberInvite: { type: Boolean, default: true },
      restrictedContent: { type: Boolean, default: false }
    }, //

    // --- ⚙️ RÉGLAGES DU NEXUS ---
    settings: {
      isGlobalReducedSpeed: { type: Boolean, default: false }, //
      allowSearch: { type: Boolean, default: true }, //
      themeColor: { type: String, default: '#10b981' } // Emerald-500 par défaut
    },

    // --- 🧠 SANTÉ COLLECTIVE & MODÉRATION ---
    collectiveHealth: {
      averageMentalLoad: { type: Number, min: 0, max: 100, default: 0 }, //
      isOverloaded: { type: Boolean, default: false }, //
      lastPulseCheck: Date //
    },

    moderation: {
      isFlagged: { type: Boolean, default: false }, //
      reportCount: { type: Number, default: 0 } //
    },
  }, 
  { 
    timestamps: true, //
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
                         mongoose.model<ITeamDocument>('Team', TeamSchema); //
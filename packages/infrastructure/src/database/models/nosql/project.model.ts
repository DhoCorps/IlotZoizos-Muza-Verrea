// packages/infrastructure/src/database/models/nosql/project.model.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IProject } from '@ilot/types'; // 🛡️ Utilisation de l'interface purifiée

/**
 * 🏗️ PROJECT DOCUMENT
 */
export interface IProjectDocument extends Omit<IProject, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    // --- 🌉 LE PONT NEO4J ---
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    },

    // --- 🏷️ IDENTITÉ & HIÉRARCHIE ---
    name: { type: String, required: true, trim: true, index: true, unique: false },
    slug: { type: String, required: true, unique: false, trim: true, index: true }, 
    tag: { type: String, uppercase: true, trim: true }, 
    description: { type: String, maxlength: 2000 },
    
    parentId: { type: String, default: null, index: true }, 
    ownerUid: { type: String, required: true, index: true },
    creatorUid: { type: String, required: true, index: true },  
    
    // 🛡️ SUTURE : Remplacement de managerId par guardianUid [cite: 2026-02-11]
    guardianUid: { type: String, index: true }, 
    
    teamIds: [{ type: String, index: true }], 

    // --- 🎨 APPARENCE (Vibration Bio-Tech) ---
    appearance: {
      icon: { type: String, default: 'folder' },
      // 🛡️ SUTURE : Gris Bleuté par défaut [cite: 2026-03-27]
      color: { type: String, default: '#8b9dc3' }, 
      bannerUrl: String,
      avatarUrl: String,
    },

    // --- 📊 ÉTAT & TEMPORALITÉ ---
    status: { 
      type: String, 
      enum: ['CONCEPT', 'PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'REDUCED_SPEED', 'ARCHIVED'],
      default: 'CONCEPT' 
    },
    priority: { 
      type: String, 
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKER'],
      default: 'MEDIUM' 
    },
    category: { 
      type: String, 
      enum: ['TECHNICAL', 'ARTISTIC', 'SOCIAL', 'COMMERCIAL', 'RESEARCH', 'OPEN_SOURCE', 'PERSONAL'],
      default: 'TECHNICAL' 
    },
    visibility: { 
      type: String, 
      enum: ['PUBLIC', 'INTERNAL', 'PRIVATE', 'SECRET'],
      default: 'PRIVATE' 
    },

    documents: [{
      uid: { type: String, required: true },
      name: { type: String, required: true },
      label: { type: String },
      url: { type: String, required: true },
      mimeType: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],
    
    dates: {
      start: Date,
      deadline: Date,
      completedAt: Date,
      lastActivity: { type: Date, default: Date.now }
    },

    // --- 🎯 ROADMAP & VIBRATIONS ---
    roadmap: {
      progress: { type: Number, min: 0, max: 100, default: 0 },
      milestones: [{
        id: { type: String, default: () => uuidv4() },
        label: String,
        isCompleted: { type: Boolean, default: false },
        dueDate: Date,
        weight: { type: Number, default: 1 }
      }],
      // 🛡️ SUTURE : Adieu KPIs, bonjour Vibrations [cite: 2025-06-14]
      vibrations: [{
        label: String,
        target: Number,
        current: { type: Number, default: 0 },
        unit: String
      }]
    },

    // --- 🌳 LA SÈVE (Énergie & Ressources) ---
    // 🛡️ SUTURE : Remplacement de financials par energySap [cite: 2025-06-14]
    energySap: {
      resourceFlow: {
        estimated: { type: Number, default: 0 },
        spent: { type: Number, default: 0 },
        currency: { type: String, default: 'EUR' }
      },
      sources: [String],
      isMonetized: { type: Boolean, default: false }
    },

    infrastructure: {
      tools: [String], 
      physicalLocation: String,
      hardwareRequirements: [String]
    },

    // --- 🧠 SANTÉ COLLECTIVE & GOUVERNANCE ---
    health: {
      complexityLevel: { type: Number, min: 1, max: 10, default: 5 },
      riskLevel: { 
        type: String, 
        enum: ['SAFE', 'STABLE', 'WARNING', 'CRITICAL'], 
        default: 'SAFE' 
      },
      mitigationPlans: [String]
    },

    governance: {
      isOpenSource: { type: Boolean, default: false },
      license: { type: String, default: 'MIT' },
      allowSubProjects: { type: Boolean, default: true },
      restrictedAccess: { type: Boolean, default: false }
    },

    // --- 🛡️ SÉCURITÉ DU SANCTUAIRE ---
    moderation: {
      isFlagged: { type: Boolean, default: false },
      internalNotes: String
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

ProjectSchema.index({ name: 'text', description: 'text', tag: 'text' });

export const ProjectModel = (mongoose.models.Project as Model<IProjectDocument>) || 
                           mongoose.model<IProjectDocument>('Project', ProjectSchema);
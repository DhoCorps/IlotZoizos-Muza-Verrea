import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IProject } from '../../../../../types/src/models/project.types'; // Ta source de vérité Zod

/**
 * 🏗️ PROJECT DOCUMENT
 * Extension de l'interface IProject avec les types Mongoose
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
    name: { type: String, required: true, trim: true, index: true },
    tag: { type: String, uppercase: true, trim: true }, // ex: [RENEWALL]
    description: { type: String, maxlength: 2000 },
    
    parentId: { type: String, default: null, index: true }, // Pour les projets de projets
    ownerId: { type: String, required: true, index: true }, // L'ID du créateur ou du Nid
    managerId: { type: String, index: true },
    teamIds: [{ type: String, index: true }], // Les Nids (Teams) travaillant sur le projet

    // --- 🎨 APPARENCE (Logique Bio-Tech) ---
    appearance: {
      icon: { type: String, default: 'folder' },
      color: { type: String, default: '#E5484D' }, // Ton rouge organique
      bannerUrl: String,
      avatarUrl: String,
    },

    // --- 📊 ÉTAT & TEMPORALITÉ ---
    status: { 
      type: String, 
      enum: ['CONCEPT', 'PLANNING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
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
    
    dates: {
      start: Date,
      deadline: Date,
      completedAt: Date,
      lastActivity: { type: Date, default: Date.now }
    },

    // --- 📂 GESTION DES FICHIERS (Ta demande spécifique) ---
    fileUploads: [{ type: String }], // Tableau d'URLs des fichiers uploadés

    // --- 🎯 ROADMAP & AVANCEMENT ---
    roadmap: {
      progress: { type: Number, min: 0, max: 100, default: 0 },
      milestones: [{
        id: { type: String, default: () => uuidv4() },
        label: String,
        isCompleted: { type: Boolean, default: false },
        dueDate: Date,
        weight: { type: Number, default: 1 }
      }],
      kpis: [{
        label: String,
        target: Number,
        current: { type: Number, default: 0 },
        unit: String
      }]
    },

    // --- 💰 ÉCONOMIE & INFRASTRUCTURE ---
    financials: {
      budget: {
        estimated: { type: Number, default: 0 },
        spent: { type: Number, default: 0 },
        currency: { type: String, default: 'EUR' }
      },
      fundingSources: [String],
      isMonetized: { type: Boolean, default: false }
    },

    infrastructure: {
      tools: [String], // ex: ["Next.js", "Neo4j"]
      physicalLocation: String,
      hardwareRequirements: [String]
    },

    // --- 🧠 SANTÉ COLLECTIVE & GOUVERNANCE ---
    health: {
      complexityLevel: { type: Number, min: 1, max: 10, default: 5 },
      averageMentalLoad: { type: Number, min: 0, max: 100, default: 0 },
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

    // --- 🛡️ MODÉRATION ---
    moderation: {
      isFlagged: { type: Boolean, default: false },
      reportCount: { type: Number, default: 0 },
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

// Indexation pour la recherche performante dans le Nexus
ProjectSchema.index({ name: 'text', description: 'text', tag: 'text' });

export const ProjectModel = (mongoose.models.Project as Model<IProjectDocument>) || 
                           mongoose.model<IProjectDocument>('Project', ProjectSchema);
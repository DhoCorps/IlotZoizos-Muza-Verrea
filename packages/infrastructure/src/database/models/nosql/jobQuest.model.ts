// Fichier : packages/infrastructure/src/database/models/nosql/jobQuest.model.ts
import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IJobQuestDocument extends Document {
  uid: string;
  projectUid: string;
  title: string;
  slug: string; // 🪡 L'index pour l'URL
  description: string;
  
  // 💼 LOGISTIQUE & CONDITIONS MATÉRIELLES
  workArrangement: 'FULL_REMOTE' | 'HYBRID' | 'ON_SITE';
  contractType: 'FREELANCE' | 'CDI' | 'CDD' | 'INTERNSHIP' | 'PARTNERSHIP' | 'BOUNTY' | 'OTHER';
  experienceLevel: 'APPRENTICE' | 'JUNIOR' | 'CONFIRMED' | 'SENIOR' | 'MASTER' | 'GURU';
  
  // ⚖️ SUTURE MATCHMAKING
  maxBudgetCents?: number | null;
  currency: string;

  // ⏳ TEMPORALITÉ
  startDate?: Date;
  estimatedDuration?: string;

  // 🎯 COMPÉTENCES & RÉCOMPENSES
  requiredSkills: string[];
  rewardLore?: string;
  
  // 🎲 LE SUPERFLU NÉCESSAIRE (Flavor RPG)
  questDifficulty: 'PEACEFUL' | 'NORMAL' | 'HARD' | 'NIGHTMARE' | 'LUNATIC';
  dangerLevel: number;
  perks: string[];

  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'ARCHIVED';
  createdAt: Date;
}

const JobQuestSchema = new Schema<IJobQuestDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  projectUid: { type: String, required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡 Indexé pour la recherche SEO
  description: { type: String, required: true },
  
  // 💼 --- LOGISTIQUE & CONDITIONS MATÉRIELLES ---
  workArrangement: { 
    type: String, 
    enum: ['FULL_REMOTE', 'HYBRID', 'ON_SITE'], 
    default: 'FULL_REMOTE' 
  },
  contractType: { 
    type: String, 
    enum: ['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER'], 
    default: 'FREELANCE' 
  },
  experienceLevel: { 
    type: String, 
    enum: ['APPRENTICE', 'JUNIOR', 'CONFIRMED', 'SENIOR', 'MASTER', 'GURU'], 
    default: 'CONFIRMED' 
  },
  
  // ⚖️ --- SUTURE MATCHMAKING (L'Économie de l'Îlot) ---
  maxBudgetCents: { type: Number, min: 0 },
  currency: { type: String, default: 'EUR' },

  // ⏳ --- TEMPORALITÉ ---
  startDate: { type: Date },
  estimatedDuration: { type: String },

  // 🎯 --- COMPÉTENCES & RÉCOMPENSES ---
  requiredSkills: [{ type: String }],
  rewardLore: { type: String },
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  questDifficulty: { 
    type: String, 
    enum: ['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC'], 
    default: 'NORMAL' 
  },
  dangerLevel: { type: Number, min: 0, max: 100, default: 10 },
  perks: [{ type: String }],

  status: { 
    type: String, 
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'ARCHIVED'], 
    default: 'ACTIVE' 
  },
}, { timestamps: true });

export const JobQuestModel = mongoose.models.JobQuest || mongoose.model<IJobQuestDocument>('JobQuest', JobQuestSchema);
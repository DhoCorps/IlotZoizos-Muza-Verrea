import mongoose from 'mongoose';
import type { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IJobQuestDocument extends Document {
  uid: string;
  projectUid: string;
  title: string;
  slug: string; // 🪡 L'index pour l'URL
  description: string;
  
  // 🏢 INFORMATIONS ENTREPRISE / GUILDE
  company?: {
    name: string;
    description: string;
    websiteUrl?: string;
    logoUrl?: string;
  };

  // 💼 LOGISTIQUE & CONDITIONS MATÉRIELLES
  workArrangement: 'FULL_REMOTE' | 'HYBRID' | 'ON_SITE';
  contractType: 'FREELANCE' | 'CDI' | 'CDD' | 'INTERNSHIP' | 'PARTNERSHIP' | 'BOUNTY' | 'OTHER';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCE' | 'CONTRACT' | 'INTERNSHIP';
  experienceLevel: 'APPRENTICE' | 'JUNIOR' | 'MID' | 'CONFIRMED' | 'SENIOR' | 'LEAD' | 'MASTER' | 'GURU';
  location: string;

  // ⚖️ SUTURE MATCHMAKING
  minBudgetCents?: number | null;
  maxBudgetCents?: number | null;
  budgetType: 'DAILY_RATE' | 'FIXED_PRICE' | 'YEARLY_SALARY';
  currency: string;

  // ⏳ TEMPORALITÉ
  startDate?: Date;
  estimatedDuration?: string;
  applicationDeadline?: Date;

  // 🎯 COMPÉTENCES & RÉCOMPENSES
  requiredSkills: string[];
  bonusSkills: string[];
  requirements: string[];
  responsibilities: string[];
  rewardLore?: string;
  
  // 🎲 LE SUPERFLU NÉCESSAIRE (Flavor RPG)
  questDifficulty: 'PEACEFUL' | 'NORMAL' | 'HARD' | 'NIGHTMARE' | 'LUNATIC';
  dangerLevel: number;
  perks: string[];

  // 🚀 SQUELETTE MUTUALISÉ
  tags: string[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
  settings: {
    allowApplications: boolean;
  };

  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FILLED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const JobQuestSchema = new Schema<IJobQuestDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  projectUid: { type: String, required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡 Indexé pour la recherche SEO
  description: { type: String, required: true },
  
  company: {
    name: { type: String },
    description: { type: String },
    websiteUrl: { type: String },
    logoUrl: { type: String }
  },

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
  employmentType: { 
    type: String, 
    enum: ['FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP'], 
    default: 'FULL_TIME' 
  },
  experienceLevel: { 
    type: String, 
    enum: ['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU'], 
    default: 'CONFIRMED' 
  },
  location: { type: String, default: 'Remote' },
  
  // ⚖️ --- SUTURE MATCHMAKING (L'Économie de l'Îlot) ---
  minBudgetCents: { 
    type: Number, 
    min: 0,
    validate: {
      validator: function(this: IJobQuestDocument, value: number) {
        // Validation synchrone croisée directement sur le champ
        if (value != null && this.maxBudgetCents != null) {
          return value <= this.maxBudgetCents;
        }
        return true;
      },
      message: 'Hérésie mathématique : Le budget minimum ne peut pas être supérieur au budget maximum.'
    }
  },
  maxBudgetCents: { type: Number, min: 0 },
  budgetType: { 
    type: String, 
    enum: ['DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY'], 
    default: 'DAILY_RATE' 
  },
  currency: { type: String, default: 'EUR' },

  // ⏳ --- TEMPORALITÉ ---
  startDate: { type: Date },
  estimatedDuration: { type: String },
  applicationDeadline: { type: Date },

  // 🎯 --- COMPÉTENCES & RÉCOMPENSES ---
  requiredSkills: [{ type: String }],
  bonusSkills: [{ type: String }],
  requirements: [{ type: String }],
  responsibilities: [{ type: String }],
  rewardLore: { type: String },
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  questDifficulty: { 
    type: String, 
    enum: ['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC'], 
    default: 'NORMAL' 
  },
  dangerLevel: { type: Number, min: 0, max: 100, default: 10 },
  perks: [{ type: String }],

  // 🚀 --- SQUELETTE MUTUALISÉ ---
  tags: [{ type: String }],
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String }
  },
  settings: {
    allowApplications: { type: Boolean, default: true }
  },

  status: { 
    type: String, 
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'ARCHIVED'], 
    default: 'ACTIVE' 
  },
}, { timestamps: true });

export const JobQuestModel = mongoose.models.JobQuest || mongoose.model<IJobQuestDocument>('JobQuest', JobQuestSchema);
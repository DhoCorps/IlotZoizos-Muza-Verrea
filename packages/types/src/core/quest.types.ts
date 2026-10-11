// Fichier : packages/types/src/core/quest.types.ts
import { z } from 'zod';
import { SeoMetadataSchema } from './seo.types';
import { BudgetConstraintSchema } from './kontakt.types';

export const WorkArrangementSchema = z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']);
export const ContractTypeSchema = z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']);
export const EmploymentTypeSchema = z.enum(['FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP']);
export const ExperienceLevelSchema = z.enum([
  'APPRENTICE',
  'JUNIOR',
  'MID',
  'CONFIRMED',
  'SENIOR',
  'LEAD',
  'MASTER',
  'GURU'
]);
export const QuestDifficultySchema = z.enum(['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC']);
export const QuestStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'COMPLETED', 'ARCHIVED']);
export const BudgetTypeSchema = z.enum(['DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY']);

// 🆕 Sous-schéma pour les informations de l'entreprise / guilde
export const CompanyInfoSchema = z.object({
  name: z.string().min(2, "Le nom de l'entreprise est requis"),
  description: z.string().min(10, "La description de l'entreprise doit être plus détaillée").default(''),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

/**
 * 🛡️ SCHÉMA UNIFIÉ DES QUÊTES (JobQuest SSOT)
 * Fusionne les besoins RH de Kontakt et la mécanique RPG/Matchmaking de l'Îlot.
 */
export const JobQuestSchema = z.object({
  uid: z.string(),
  projectUid: z.string().optional(), // Optionnel pour les quêtes de guilde hors-chantier
  title: z.string().min(3, "Le titre de la quête est requis"), 
  slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL de la quête
  description: z.string().min(10, "La description doit comporter au moins 10 caractères"),
  
  // 🏢 --- ENTREPRISE / GUILDE ---
  company: CompanyInfoSchema.optional(),

  // 💼 --- LOGISTIQUE & CONDITIONS MATÉRIELLES ---
  workArrangement: WorkArrangementSchema.default('FULL_REMOTE'),
  contractType: ContractTypeSchema.default('FREELANCE'),
  employmentType: EmploymentTypeSchema.default('FULL_TIME'),
  experienceLevel: ExperienceLevelSchema.default('CONFIRMED'),
  location: z.string().default('Remote'),
  
  // ⚖️ --- SUTURE MATCHMAKING (L'Économie de l'Îlot) ---
  minBudgetCents: z.number().min(0, "Le budget minimum ne peut être négatif").optional().nullable(),
  maxBudgetCents: z.number().min(0, "Le budget maximum ne peut être négatif").optional().nullable(),
  budgetConstraint: BudgetConstraintSchema.optional(),
  budgetType: BudgetTypeSchema.default('DAILY_RATE'),
  currency: z.string().default('EUR'),

  // ⏳ --- TEMPORALITÉ ---
  startDate: z.coerce.date().optional(),
  estimatedDuration: z.string().optional(), // ex: "6 mois", "Quête infinie"
  applicationDeadline: z.coerce.date().optional(),

  // 🎯 --- COMPÉTENCES, MISSIONS & RÉCOMPENSES ---
  requiredSkills: z.array(z.string()).default([]),
  bonusSkills: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  rewardLore: z.string().optional(),
  rewardXp: z.number().default(100),
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  questDifficulty: QuestDifficultySchema.default('NORMAL'),
  dangerLevel: z.number().min(0).max(100).default(10),
  perks: z.array(z.string()).default([]),

  // 🚀 --- SQUELETTE OBLIGATOIRE MUTUALISÉ (Tags, SEO & Settings) ---
  tags: z.array(z.string()).default([]),
  seo: SeoMetadataSchema.default({}),
  settings: z.object({
    allowApplications: z.boolean().default(true),
  }).default({}),

  status: QuestStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()),
}).refine(
  (data) => {
    // 🛡️ Validation croisée : Le Min ne doit pas dépasser le Max s'ils sont tous les deux renseignés
    if (data.minBudgetCents != null && data.maxBudgetCents != null) {
      return data.minBudgetCents <= data.maxBudgetCents;
    }
    return true;
  },
  {
    message: "Hérésie mathématique : Le budget minimum ne peut pas être supérieur au budget maximum.",
    path: ["minBudgetCents"],
  }
);

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;
export type JobQuest = z.infer<typeof JobQuestSchema>;
export type JobQuestInput = z.input<typeof JobQuestSchema>;
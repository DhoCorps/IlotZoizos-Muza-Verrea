// Fichier : packages/types/src/core/quest.types.ts
import { z } from 'zod';

export const WorkArrangementSchema = z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']);
export const ContractTypeSchema = z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']);
export const ExperienceLevelSchema = z.enum(['APPRENTICE', 'JUNIOR', 'CONFIRMED', 'SENIOR', 'MASTER', 'GURU']);
export const QuestDifficultySchema = z.enum(['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC']);
export const QuestStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'ARCHIVED']);

export const JobQuestSchema = z.object({
  uid: z.string(),
  projectUid: z.string(),
  title: z.string().min(3, "Le titre de la quête est requis"), 
  slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL de la quête
  description: z.string().min(10, "La description doit comporter au moins 10 caractères"),
  
  // 💼 --- LOGISTIQUE & CONDITIONS MATÉRIELLES ---
  workArrangement: WorkArrangementSchema.default('FULL_REMOTE'),
  contractType: ContractTypeSchema.default('FREELANCE'),
  experienceLevel: ExperienceLevelSchema.default('CONFIRMED'),
  
  // ⚖️ --- SUTURE MATCHMAKING (L'Économie de l'Îlot) ---
  maxBudgetCents: z.number().min(0, "Le budget ne peut être négatif").optional().nullable(),
  currency: z.string().default('EUR'),

  // ⏳ --- TEMPORALITÉ ---
  startDate: z.coerce.date().optional(),
  estimatedDuration: z.string().optional(), // ex: "6 mois", "Quête infinie"

  // 🎯 --- COMPÉTENCES & RÉCOMPENSES ---
  requiredSkills: z.array(z.string()).default([]),
  rewardLore: z.string().optional(), // Ce qu'on gagne spirituellement (ex: "Une place au panthéon des développeurs")
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  questDifficulty: QuestDifficultySchema.default('NORMAL'),
  dangerLevel: z.number().min(0).max(100).default(10), // Jauge de risque de crunch ou de pression (0 = chill, 100 = burnout garanti)
  perks: z.array(z.string()).default([]), // Avantages (ex: ["Café infusé à froid", "Setup triple écran", "Mentor Balrog"])

  status: QuestStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date().default(() => new Date()),
});

export type JobQuest = z.infer<typeof JobQuestSchema>;
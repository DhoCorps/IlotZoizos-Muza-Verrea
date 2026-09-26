// Fichier : packages/types/src/core/quest.types.ts
import { z } from 'zod';

export const WorkArrangementSchema = z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']);
export const ContractTypeSchema = z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']);
export const ExperienceLevelSchema = z.enum(['APPRENTICE', 'JUNIOR', 'CONFIRMED', 'SENIOR', 'MASTER', 'GURU']);
export const QuestDifficultySchema = z.enum(['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC']);
export const QuestStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'ARCHIVED']);
export const BudgetTypeSchema = z.enum(['DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY']); // 🆕 Type de rémunération

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
  minBudgetCents: z.number().min(0, "Le budget minimum ne peut être négatif").optional().nullable(), // 🆕 Fourchette basse
  maxBudgetCents: z.number().min(0, "Le budget maximum ne peut être négatif").optional().nullable(),
  budgetType: BudgetTypeSchema.default('DAILY_RATE'), // 🆕 TJM par défaut
  currency: z.string().default('EUR'),

  // ⏳ --- TEMPORALITÉ ---
  startDate: z.coerce.date().optional(),
  estimatedDuration: z.string().optional(), // ex: "6 mois", "Quête infinie"
  applicationDeadline: z.coerce.date().optional(), // 🆕 Date limite pour postuler

  // 🎯 --- COMPÉTENCES & RÉCOMPENSES ---
  requiredSkills: z.array(z.string()).default([]),
  bonusSkills: z.array(z.string()).default([]), // 🆕 Les "nice to have" pour affiner le matchmaking
  rewardLore: z.string().optional(), // Ce qu'on gagne spirituellement (ex: "Une place au panthéon des développeurs")
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  questDifficulty: QuestDifficultySchema.default('NORMAL'),
  dangerLevel: z.number().min(0).max(100).default(10), // Jauge de risque de crunch ou de pression (0 = chill, 100 = burnout garanti)
  perks: z.array(z.string()).default([]), // Avantages (ex: ["Café infusé à froid", "Setup triple écran", "Mentor Balrog"])

  status: QuestStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date()), // 🆕 Trace de la dernière mise à jour
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
    path: ["minBudgetCents"], // L'erreur ciblera ce champ spécifique dans les formulaires
  }
);

export type JobQuest = z.infer<typeof JobQuestSchema>;
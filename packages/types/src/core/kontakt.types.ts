import { z } from 'zod';
import { SeoMetadataSchema } from './seo.types'; // 🚀 Intégration du squelette SEO

export const TTRPGAlignmentEnum = z.enum([
  'LOYAL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD',
  'LOYAL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL',
  'LOYAL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL',
  'ANGE_INS', 'DEMON_INS', 'REPLICANT_BR', 'HUMAIN_BR'
]);

export const CharacterAttributesSchema = z.object({
  force: z.number().min(1).max(20).default(10),
  agilite: z.number().min(1).max(20).default(10),
  intelligence: z.number().min(1).max(20).default(10),
  charisme: z.number().min(1).max(20).default(10),
  empathieVoightKampff: z.number().min(0).max(100).default(50),
});

// Sous-schémas Kontakt (Portfolio, Pricing, Budget, Review)
export const PortfolioItemSchema = z.object({
  type: z.enum(['IMAGE', 'GITHUB_REPO', 'AUDIO', '3D', 'WEB']),
  url: z.string().url(),
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const PricingProfileSchema = z.object({
  hourlyRateCents: z.number().min(0),
  missionRateCents: z.number().min(0),
  currency: z.string().default('EUR'),
});

export const BudgetConstraintSchema = z.object({
  minBudgetCents: z.number().min(0),
  maxBudgetCents: z.number().min(0),
});

export const ReviewSchema = z.object({
  authorUid: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  isVerifiedHire: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const KontaktProfileSchema = z.object({
  uid: z.string(),
  userUid: z.string(),
  professionalTitle: z.string().min(3, "Intitulé de poste requis"),
  slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL du profil
  seniorityYears: z.number().default(0),
  skills: z.array(z.string()).default([]),
  portfolioUrl: z.string().url().optional(),
  availabilityStatus: z.enum(['OPEN_TO_WORK', 'ON_A_QUEST', 'RECRUITED']).default('OPEN_TO_WORK'),
  
  archetypeClass: z.string(),
  alignment: TTRPGAlignmentEnum.default('TRUE_NEUTRAL'),
  attributes: CharacterAttributesSchema.default({}),
  specialArtifacts: z.array(z.string()).default([]),
  biographyLore: z.string().max(500, "Le lore ne doit pas dépasser le parchemin").default(''),
  
  // Propriétés Kontakt existantes
  portfolioItems: z.array(PortfolioItemSchema).default([]),
  pricing: PricingProfileSchema.optional(),
  reviews: z.array(ReviewSchema).default([]),

  // 🚀 Squelette obligatoire mutualisé (Tags, SEO & Settings de gouvernance)
  tags: z.array(z.string()).default([]),
  seo: SeoMetadataSchema.default({}),
  settings: z.object({
    allowDirectContact: z.boolean().default(true),
    showcaseBadge: z.boolean().default(true),
  }).default({}),

  createdAt: z.date().optional(),
});

// 🆕 Sous-schéma pour les informations de l'entreprise / guilde
export const CompanyInfoSchema = z.object({
  name: z.string().min(2, "Le nom de l'entreprise est requis"),
  description: z.string().min(10, "La description de l'entreprise doit être plus détaillée").default(''),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

// Schéma pour les Quêtes JDR / Job Quests avec Slug, Budget et Squelette mutualisé
export const JobQuestSchema = z.object({
  uid: z.string(),
  title: z.string().min(3, "Le titre de la quête est requis"),
  slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL de la quête
  description: z.string(), // Description globale de la quête
  
  // 🆕 Nouveaux champs d'enrichissement pour le Recrutement
  company: CompanyInfoSchema.optional(), // Infos sur la guilde/entreprise
  requirements: z.array(z.string()).default([]), // Compétences/Prérequis attendus
  responsibilities: z.array(z.string()).default([]), // Missions spécifiques du poste
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP']).default('FULL_TIME'),
  experienceLevel: z.enum(['JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MASTER']).default('MID'),
  location: z.string().default('Remote'), // Localisation ou "Remote"
  perks: z.array(z.string()).default([]), // Avantages (mutuelle, matériel, loots spécifiques...)

  rewardXp: z.number().default(100),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  
  budgetConstraint: BudgetConstraintSchema.optional(),

  // 🚀 Squelette obligatoire mutualisé pour les quêtes
  tags: z.array(z.string()).default([]),
  seo: SeoMetadataSchema.default({}),
  settings: z.object({
    allowApplications: z.boolean().default(true),
  }).default({}),

  createdAt: z.date().optional(),
});

export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
export type PricingProfile = z.infer<typeof PricingProfileSchema>;
export type BudgetConstraint = z.infer<typeof BudgetConstraintSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

export type KontaktProfile = z.infer<typeof KontaktProfileSchema>;
export type JobQuest = z.infer<typeof JobQuestSchema>;
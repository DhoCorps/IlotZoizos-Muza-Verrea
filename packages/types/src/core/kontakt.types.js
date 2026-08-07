import { z } from 'zod';
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
    createdAt: z.date().optional(),
});
// Schéma pour les Quêtes JDR / Job Quests avec Slug
export const JobQuestSchema = z.object({
    uid: z.string(),
    title: z.string().min(3, "Le titre de la quête est requis"),
    slug: z.string().min(1, "Slug requis"), // 🪡 L'empreinte URL de la quête
    description: z.string(),
    rewardXp: z.number().default(100),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
    createdAt: z.date().optional(),
});

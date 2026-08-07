import { z } from 'zod';
// ==========================================
// 1. ÉNUMÉRATIONS (Les Catégories et États)
// ==========================================
export const SujetCategorySchema = z.enum([
    'MONOLOGUE',
    'POETRY',
    'TUTORIAL',
    'LORE',
    'MANIFESTO'
]);
export const SujetStatusSchema = z.enum([
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
]);
// ==========================================
// 2. LE SCHÉMA PRINCIPAL ZOD
// ==========================================
export const SujetSchema = z.object({
    uid: z.string(),
    // --- IDENTITÉ & CONTENU ---
    title: z.string().min(1, "Le titre est requis"),
    slug: z.string().min(1, "Le slug est requis"), // 🪡 LE NOUVEAU CHAMP
    content: z.string().min(1, "Le contenu est requis"),
    // --- NOUVEAUX CHAMPS LITTÉRAIRES ---
    lyrics: z.string().optional(),
    copyright: z.string().optional(),
    authorUid: z.string(),
    // --- VIBRATION & ÉTAT ---
    category: SujetCategorySchema.default('MONOLOGUE'),
    status: SujetStatusSchema.default('DRAFT'),
    tags: z.array(z.string()).default([]),
    // --- LE TISSU CONNECTEUR ---
    connections: z.object({
        relatedProjects: z.array(z.string()).default([]),
        relatedTasks: z.array(z.string()).default([]),
        relatedProducts: z.array(z.string()).default([]),
        relatedGames: z.array(z.string()).default([])
    }).default({}),
    // 🛍️ SUTURE E-COMMERCE
    merchLink: z.object({
        productId: z.string().optional(),
        sku: z.string().optional(),
        displayMode: z.string().default('card')
    }).optional(),
    // --- MÉDIAS & ANCRAGES SENSORIELS ---
    media: z.object({
        coverImageUrl: z.string().optional(),
        audioTrackUrl: z.string().optional()
    }).optional(),
    // --- GOUVERNANCE & MODÉRATION ---
    settings: z.object({
        allowComments: z.boolean().default(true),
        allowEmojiReactions: z.boolean().default(true),
        isAgeRestricted: z.boolean().default(false)
    }).default({}),
    // --- STATISTIQUES ---
    resonance: z.object({
        views: z.number().default(0),
        readsCompleted: z.number().default(0)
    }).default({})
});

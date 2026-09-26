import { z } from 'zod';
import { CopyrightMetadataSchema } from '../core/copyright.types';

// 🔠 Énumération des catégories typographiques historiques et descriptions explicatives
export enum TypographicCategoryEnum {
  HUMANE = 'HUMANE',
  GARALDE = 'GARALDE',
  DIDINE = 'DIDINE',
  MECANE = 'MECANE',
  LINEALE = 'LINEALE',
  SCRIPTURE = 'SCRIPTURE',
  GOTHIQUE = 'GOTHIQUE',
  FANTAISIE = 'FANTAISIE',
}

export const TYPOGRAPHIC_CATEGORY_DESCRIPTIONS: Record<TypographicCategoryEnum, string> = {
  [TypographicCategoryEnum.HUMANE]: "Caractères inspirés de l'écriture humaniste et de la calligraphie de la Renaissance (axes inclinés, empattements doux).",
  [TypographicCategoryEnum.GARALDE]: "Style transitionnel du XVIe siècle alliant élégance classique et géométrie plus rigoureuse.",
  [TypographicCategoryEnum.DIDINE]: "Styles Didot et Bodoni à fort contraste entre pleins et déliés, empattements filiformes.",
  [TypographicCategoryEnum.MECANE]: "Caractères dits 'Égyptiens' caractérisés par des empattements carrés massifs et uniformes.",
  [TypographicCategoryEnum.LINEALE]: "Typographies sans empattements (Sans-Serif), épurées, modernes et géométriques.",
  [TypographicCategoryEnum.SCRIPTURE]: "Imitation fluide de l'écriture manuscrite et de la cursive calligraphiée.",
  [TypographicCategoryEnum.GOTHIQUE]: "Caractères brisés d'inspiration médiévale aux tracés anguleux et serrés.",
  [TypographicCategoryEnum.FANTAISIE]: "Polices expérimentales, décoratives ou pixel-art pures.",
};

// 🏛️ Remarque : CopyrightMetadataSchema est importé directement depuis core/copyright.types pour éviter toute redondance.

export const SeoMetadataSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

// 🔄 Modèle de Barter (Troc) pour les glyphes individuels
export const GlyphBarterSchema = z.object({
  isBarterable: z.boolean().default(false),
  barterValueKarma: z.number().default(0),
  desiredExchangeGlyph: z.string().optional(),
});

// 🎞️ Un frame de sprite
export const SpriteFrameSchema = z.object({
  frameIndex: z.number(),
  width: z.number().default(16),
  height: z.number().default(16),
  pixels: z.array(z.string()),
});

// 🔣 Le glyphe relié à un caractère et ses frames
export const GlyphSpriteMappingSchema = z.object({
  character: z.string(), 
  unicodeCodePoint: z.string().optional(),
  frames: z.array(SpriteFrameSchema),
  advanceWidth: z.number().default(16),
  barter: GlyphBarterSchema.optional(),
});

// 🎮 Attributs de Gamification et Quotas de la Forge Letr'In
export const LetrinGamificationSchema = z.object({
  palette: z.array(z.string()).default([]), // Couleurs débloquées par l'Oiseau
  alchemicalXp: z.number().default(0),     // Expérience accumulée dans la forge
  glitchCorruptionLevel: z.number().default(0), // Degré de distorsion/corruption abyssale
  unlockedFontSlots: z.number().default(3),    // Emplacements de polices max au départ
  unlockedSpriteSlots: z.number().default(3),  // Emplacements de sprites max au départ
});

// ⚡ La police Letr'In complète, enrichie et gamifiée
export const LetrinFontSpriteSchema = z.object({
  uid: z.string(),
  name: z.string().min(1, "Le nom de la police est requis"),
  slug: z.string().min(1, "Le slug est requis"),
  authorUid: z.string(),
  gridSize: z.object({
    width: z.number().default(16),
    height: z.number().default(16),
  }),
  category: z.nativeEnum(TypographicCategoryEnum).default(TypographicCategoryEnum.LINEALE),
  categoryDescription: z.string().optional(),
  tags: z.array(z.string()).default([]),
  seo: SeoMetadataSchema.optional(),
  copyrightMetadata: CopyrightMetadataSchema.optional(),
  frequencyHz: z.number().default(432),          // Fréquence harmonique alchimique de la police
  isFrequencyMuted: z.boolean().default(false),  // Option de mutation sonore de la police
  glyphs: z.array(GlyphSpriteMappingSchema),
  gamification: LetrinGamificationSchema.optional(),
  status: z.enum(['DRAFT', 'RELEASED', 'ARCHIVED']).default('DRAFT'),
  createdAt: z.date().optional(),
});

export type LetrinFontSprite = z.infer<typeof LetrinFontSpriteSchema>;
export type GlyphSpriteMapping = z.infer<typeof GlyphSpriteMappingSchema>;
export type SpriteFrame = z.infer<typeof SpriteFrameSchema>;
// Note : CopyrightMetadata est déjà exporté par core/copyright.types pour éviter le conflit d'index.
export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;
export type GlyphBarter = z.infer<typeof GlyphBarterSchema>;
export type LetrinGamification = z.infer<typeof LetrinGamificationSchema>;
import { z } from 'zod';
// Un frame de sprite (matrice de pixels ou de codes couleur)
export const SpriteFrameSchema = z.object({
    frameIndex: z.number(),
    width: z.number().default(16),
    height: z.number().default(16),
    pixels: z.array(z.string()), // Représentation aplatie ou lignes de pixels
});
// Le glyphe relié à un caractère typographique et à ses sprites de frames
export const GlyphSpriteMappingSchema = z.object({
    character: z.string(),
    unicodeCodePoint: z.string().optional(),
    frames: z.array(SpriteFrameSchema),
    advanceWidth: z.number().default(16),
});
// La police Letr'In enrichie par l'éditeur de sprite
export const LetrinFontSpriteSchema = z.object({
    uid: z.string(),
    name: z.string().min(1, "Le nom de la police est requis"), // 🪡 Sécurisation du nom
    slug: z.string().min(1, "Le slug est requis"), // 🪡 NOTRE EMPREINTE URL
    authorUid: z.string(),
    gridSize: z.object({
        width: z.number().default(16),
        height: z.number().default(16),
    }),
    glyphs: z.array(GlyphSpriteMappingSchema),
    status: z.enum(['DRAFT', 'RELEASED', 'ARCHIVED']).default('DRAFT'),
    createdAt: z.date().optional(),
});

import { z } from 'zod';

/**
 * 🌌 VALIDATION ZOD : ENTRÉE LEXICALE (UNIVERS'HALL)
 * Garantit l'intégrité des phonèmes, des syllabes et des définitions multilingues.
 */
export const LexiconEntrySchema = z.object({
    uid: z.string().min(1, "L'UID est requis"),
    language: z.enum(['fr', 'en', 'es']),
    word: z.string().min(1, "Le mot est requis").toLowerCase().trim(),
    phoneticIpa: z.string().min(1, "La phonétique IPA est requise"),
    syllableCount: z.number().int().min(1, "Le nombre de syllabes doit être d'au moins 1"),
    definitions: z.object({
        fr: z.string().optional(),
        en: z.string().optional(),
        es: z.string().optional(),
    }).default({}),
    partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'jective']),
});

// ✨ Extraction automatique du type TypeScript
export type ILexiconEntryDTO = z.infer<typeof LexiconEntrySchema>;
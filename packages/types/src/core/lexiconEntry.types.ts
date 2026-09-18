import { z } from 'zod';

/**
 * 🌌 VALIDATION ZOD : ENTRÉE LEXICALE (UNIVERS'HALL)
 * Garantit l'intégrité des phonèmes, des syllabes et des définitions multilingues.
 */
// 🛡️ Schéma de validation Zod corrigé pour les définitions
const LexiconEntrySchema = z.object({
  uid: z.string().optional(),
  languageCode: z.string().min(1, "Le code de langue est requis."),
  word: z.string().min(1, "Le mot est requis."),
  phoneticIpa: z.string().min(1, "La phonétique IPA est requise."),
  syllableCount: z.number().int().positive().optional().default(1),
  definitions: z.record(z.string(), z.string()).optional().default({}), // 👈 Corrigé ici (2 arguments pour z.record)
  partOfSpeech: z.string().optional().default('noun'),
  rhymesWith: z.array(z.object({
    targetUid: z.string(),
    type: z.string(),
    match: z.string(),
  })).optional(),
  translations: z.array(z.object({
    targetUid: z.string(),
    lang: z.string(),
  })).optional(),
});

// ✨ Extraction automatique du type TypeScript
export type ILexiconEntryDTO = z.infer<typeof LexiconEntrySchema>;
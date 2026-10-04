// packages/types/src/lexicon.types.ts
import { z } from 'zod';

// Typage extensible pour les langues (fr, en, sjn, etc.)
export type SupportedLanguage = string;

/**
 * 🌌 VALIDATION ZOD : ENTRÉE LEXICALE (UNIVERS'HALL / POETRIK)
 * Source unique de vérité : valide la donnée et génère le type TypeScript.
 */
export const LexiconEntrySchema = z.object({
  uid: z.string().optional(),
  languageCode: z.string().min(1, "Le code de langue est requis (ex: 'fr', 'en', 'sjn')."),
  word: z.string().min(1, "Le mot est requis."),
  phoneticIpa: z.string().min(1, "La phonétique IPA est requise pour le calcul quantique des rimes."),
  syllableCount: z.number().int().positive().optional().default(1),
  
  // Dictionnaire dynamique multilingue { fr: "...", sjn: "..." }
  definitions: z.record(z.string(), z.string()).optional().default({}), 
  
  // 'noun' | 'verb' | 'adjective' | 'magic' | etc.
  partOfSpeech: z.string().optional().default('noun'),
  
  // Réseau phonétique (Neo4j)
  rhymesWith: z.array(z.object({
    targetUid: z.string(),
    type: z.string(),
    match: z.string(),
  })).optional().default([]),
  
  // Réseau de traduction
  translations: z.array(z.object({
    targetUid: z.string(),
    lang: z.string(),
  })).optional().default([]),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ✨ Extraction automatique du type de l'entité (remplace ton ancienne interface ILexiconEntry)
export type ILexiconEntryDTO = z.infer<typeof LexiconEntrySchema>;

/**
 * 🔍 VALIDATION ZOD : OPTIONS DE RECHERCHE DE RIMES
 */
export const RhymeQueryOptionsSchema = z.object({
  languageCode: z.string().min(1),
  rhymeType: z.enum(['rich', 'poor', 'assonance']).optional(),
  limit: z.number().int().positive().optional().default(30),
});

export type IRhymeQueryOptions = z.infer<typeof RhymeQueryOptionsSchema>;
// src/types/lexicon.ts

export type SupportedLanguage = string; // Extensible à l'infini ('fr', 'en', 'es', 'sjn', etc.)

export interface ILexiconEntry {
  uid: string;                          // ex: lex_sjn_elbereth
  languageCode: SupportedLanguage;      // 'fr', 'en', 'es', 'sjn'...
  word: string;                         // Le mot brut
  phoneticIpa: string;                  // Transcription IPA universelle (ex: "/wa.zo/")
  syllableCount: number;                // Nombre de syllabes (essentiel pour Poetrik)
  definitions: Record<string, string>;  // Dictionnaire dynamique multilingue { fr: "...", sjn: "..." }
  partOfSpeech: string;                 // 'noun' | 'verb' | 'adjective' | 'magic' | etc.
}

export interface IRhymeQueryOptions {
  languageCode: string;
  rhymeType?: 'rich' | 'poor' | 'assonance';
  limit?: number;
}
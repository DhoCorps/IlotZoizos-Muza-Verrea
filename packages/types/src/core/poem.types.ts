// packages/types/src/poem.types.ts
import { z } from 'zod';

/**
 * 🛡️ SOUS-SCHÉMA : Sceau Cryptographique & Pacte de Filiation
 */
const PoemCopyrightSchema = z.object({
  role: z.enum(['CREATOR', 'SUBLIMATOR', 'CURATOR']).default('CREATOR'),
  isExclusiveIlot: z.boolean().default(true),
  license: z.string().default('MIT / Libre Canopée'),
  filiation: z.object({
    isExternalSource: z.boolean().default(false),
    sourceAuthorName: z.string().optional(),
    sourceWorkTitle: z.string().optional(),
  }).optional()
});

/**
 * 🪶 VALIDATION ZOD : ENTITÉ POÈME (POETRIK)
 * Le parchemin poétique avec son ambiance, son SEO et ses règles d'interaction.
 */
export const PoemSchema = z.object({
  uid: z.string().optional(),
  authorUid: z.string().min(1, "L'UID de l'auteur est requis."),
  title: z.string().min(1, "Un poème doit avoir un titre."),
  content: z.string().min(1, "Le poème ne peut pas être vide."),
  language: z.string().default('fr'),
  
  // 📐 Structure & Forme
  format: z.enum(['FREE_VERSE', 'HAIKU', 'SONNET', 'PROSE', 'ALEXANDRINE']).default('FREE_VERSE'),
  syllableStructure: z.array(z.number()).optional(), 
  
  // 🎶 Ambiance Sonore (Pont vers SamploTek / Partita)
  audioAmbiance: z.object({
    trackUrl: z.string().url().optional(),
    linkedEntityUid: z.string().optional(), 
  }).optional(),

  // 🌍 SEO & Indexation
  seo: z.object({
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
  }).optional(),

  // 🛡️ Sceau & Protection
  cryptoSeal: z.object({
    digitalSignature: z.string().optional(),
    timestamp: z.date().optional(),
    copyrightMetadata: PoemCopyrightSchema.optional(),
  }).optional(),

  // ⚙️ Configuration & Sécurité de l'Âme (Le Voile de Catharsis)
  settings: z.object({
    catharsisVeil: z.boolean().default(false), // Si TRUE, désactive les commentaires
  }).optional().default({ catharsisVeil: false }),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'CONNECTIONS_ONLY']).default('PUBLIC'),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type IPoemDTO = z.infer<typeof PoemSchema>;
import { z } from 'zod';
import { BaseNodeSchema, MerchLinkSchema } from './common.types';

export const InstrumentCategorySchema = z.enum([
  'BASS',    // Pour ta fretless !
  'GUITAR',
  'PIANO',
  'DRUMS',
  'VOCAL',
  'OTHER'
]);

export const ScoreFormatSchema = z.enum([
  'ABC',      // Notation textuelle légère
  'MUSICXML', // Fichiers structurés
  'CHORDPRO', // Accords & Paroles
  'TAB'       // Tablature pure
]);

/**
 * LE SCHÉMA DE LA PARTITION (Partita)
 */
export const PartitaSchema = BaseNodeSchema.extend({
  uid: z.string(),
  title: z.string().min(1, "Une partition ne peut naître sans nom"),
  slug: z.string().min(1, "Le slug est requis"), // 🪡 L'empreinte URL
  
  // Le contenu (Code ABC, ChordPro ou notation Tab)
  content: z.string().min(1), 
  
  instrument: InstrumentCategorySchema.default('BASS'),
  format: ScoreFormatSchema.default('ABC'),
  tuning: z.string().default('E1-A1-D2-G2'), // Accordage par défaut (ex: Basse 4 cordes)

  authorUid: z.string(),

  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED']).default('DRAFT'),
  tags: z.array(z.string()).default([]),

  // Le tissu connecteur (tom§hat§toes)
  connections: z.object({
    relatedProjects: z.array(z.string()).default([]),
    relatedTasks: z.array(z.string()).default([]),
    relatedProducts: z.array(z.string()).default([]),
    relatedGames: z.array(z.string()).default([]),
  }).default({}),

  // Suture E-commerce
  merchLink: MerchLinkSchema.optional().nullable(),

  // Médias et ancrages audio
  media: z.object({
    coverImageUrl: z.string().url().optional().nullable(),
    audioTrackUrl: z.string().url().optional().nullable(), 
  }).default({}),

  settings: z.object({
    allowComments: z.boolean().default(true),
    allowEmojiReactions: z.boolean().default(true),
  }).default({ allowComments: true, allowEmojiReactions: true }),

  resonance: z.object({
    views: z.number().default(0),
    readsCompleted: z.number().default(0),
  }).default({ views: 0, readsCompleted: 0 }),
});

export type IPartita = z.infer<typeof PartitaSchema>;
export type IInstrumentCategory = z.infer<typeof InstrumentCategorySchema>;
export type IScoreFormat = z.infer<typeof ScoreFormatSchema>;
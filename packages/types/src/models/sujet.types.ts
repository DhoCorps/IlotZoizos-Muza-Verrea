// packages/types/src/models/sujet.types.ts

import { z } from 'zod';
import { BaseNodeSchema } from './common.types';

/**
 * CATÉGORIES DU SUJET (tom§hat§toes)
 * Un sujet n'est pas juste un article, c'est un état de flux.
 */
export const SujetCategorySchema = z.enum([
  'MONOLOGUE',      // Écriture d'un seul jet, organique
  'TUTORIAL',       // Transmission technique (ex: comment compiler en C)
  'POETRY',         // Un texte pur, comme "Oeil de démon" ou "Nouveaux Modèles"
  'TRACK_NOTE',     // Une note liée à une création musicale (basse, mélodica...)
  'ECHO'            // Une réponse ou une réflexion liée à un autre nœud
]);

export const SujetStatusSchema = z.enum([
  'DRAFT',          // En cours d'écriture, brouillon instable
  'PUBLISHED',      // Figé et exposé dans le flux
  'ARCHIVED',       // Retiré du flux principal mais toujours accessible
  'BURNED'          // Détruit volontairement (ne reste qu'une trace cendreuse dans Neo4j)
]);

/**
 * LE SCHÉMA DU SUJET (Le Nœud de Pensée)
 */
export const SujetSchema = BaseNodeSchema.extend({
  // --- IDENTITÉ & CONTENU ---
  uid: z.string(),
  title: z.string().min(1, "Un sujet ne peut naître sans nom"),
  slug: z.string(),
  
  // Le contenu brut, souvent du Markdown ou du texte fluide
  content: z.string().min(1), 
  
  // L'auteur du sujet (qui l'a poussé dans le flux)
  authorUid: z.string(),

  // --- VIBRATION & ÉTAT ---
  category: SujetCategorySchema.default('MONOLOGUE'),
  status: SujetStatusSchema.default('DRAFT'),
  
  // Tags pour la liaison sémantique (Neo4j adore ça)
  tags: z.array(z.string()).default([]),

  // --- LE TISSU CONNECTEUR (tom§hat§toes) ---
  // C'est ici que la magie hybride opère : un sujet peut être lié à tout.
  connections: z.object({
    relatedProjects: z.array(z.string()).default([]), // Lié à des UIDs de Projets
    relatedTasks: z.array(z.string()).default([]),    // Lié à des UIDs de Tâches
    relatedProducts: z.array(z.string()).default([]), // Lié à l'E-commerce
    relatedGames: z.array(z.string()).default([]),    // Lié au module Jeux
  }).default({}),

  // --- MÉDIAS & ANCRAGES SENSORIELS ---
  // Support natif pour les éléments multimédias (HTML Media)
  media: z.object({
    coverImageUrl: z.string().url().optional().nullable(),
    audioTrackUrl: z.string().url().optional().nullable(), // Pour tes morceaux (ex: avec la fretless)
  }).default({}),

  // --- GOUVERNANCE & MODÉRATION COLLECTIVE ---
  settings: z.object({
    allowComments: z.boolean().default(true),
    // Les emojis universels du Bordel de DhÖ (<(:< et >:)>) pourront être utilisés ici
    allowEmojiReactions: z.boolean().default(true), 
    isAgeRestricted: z.boolean().default(false),
  }).default({ allowComments: true, allowEmojiReactions: true, isAgeRestricted: false }),

  // --- STATISTIQUES (Vitesse Réduite) ---
  // On ne traque pas la performance, on observe la résonance
  resonance: z.object({
    views: z.number().default(0),
    readsCompleted: z.number().default(0),
  }).default({ views: 0, readsCompleted: 0 }),
});

// TYPESCRIPT : Extraction automatique
export type ISujet = z.infer<typeof SujetSchema>;
export type ISujetCategory = z.infer<typeof SujetCategorySchema>;
export type ISujetStatus = z.infer<typeof SujetStatusSchema>;
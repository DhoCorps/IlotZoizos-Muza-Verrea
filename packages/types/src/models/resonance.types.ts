// packages/types/src/models/resonance.types.ts

import { z } from 'zod';

// ==========================================
// 1. LES NŒUDS DE L'ÎLOT (Entités connectables)
// ==========================================
export const EntityLabelSchema = z.enum([
  'Sujet',     // AbyssBlog
  'Project',   // Tom-Hat-Toes
  'Task',      // Tom-Hat-Toes
  'Team',      // Les Nids
  'Product',   // E-commerce
  'Game',      // Jeux
  'Letter'     // Letr'In
]);

export type EntityLabel = z.infer<typeof EntityLabelSchema>;

// ==========================================
// 2. LES LIENS DU MAILLAGE (Types de Résonance)
// ==========================================
export const ResonanceTypeSchema = z.enum([
  'ILLUMINATES',   // Ex: Le Sujet éclaire/explique un Projet
  'MENTIONS',      // Ex: Le Sujet cite un Produit
  'INSPIRED_BY',   // Ex: Un Jeu est inspiré d'une Tâche
  'ECHOES',        // Ex: Un commentaire textuel d'un Oiseau
  'VIBRATES',      // Ex: Une réaction (Emoji/Like) d'un Oiseau
  'EMBEDDED_IN'    // Ex: Un Produit intégré dans une Newsletter
]);

export type ResonanceType = z.infer<typeof ResonanceTypeSchema>;

// ==========================================
// 3. SCHÉMAS DE VALIDATION (Payloads API)
// ==========================================

/**
 * Schéma pour la création d'un pont transdisciplinaire
 * Utilisé par l'API pour s'assurer que la demande de liaison est valide
 */
export const WeaveLinkSchema = z.object({
  sourceUid: z.string().min(1, "L'UID source est requis"),
  sourceLabel: EntityLabelSchema,
  targetUid: z.string().min(1, "L'UID cible est requis"),
  targetLabel: EntityLabelSchema,
  relationType: ResonanceTypeSchema,
});

export type IWeaveLink = z.infer<typeof WeaveLinkSchema>;

/**
 * Schéma pour un Écho Social (Commentaire ou Réaction)
 * Utilisé pour valider ce qu'un Oiseau envoie depuis l'interface
 */
export const EchoSchema = z.object({
  targetUid: z.string().min(1, "La cible de l'écho est requise"),
  targetLabel: EntityLabelSchema,
  echoType: z.enum(['TEXT', 'EMOJI']),
  content: z.string().min(1, "Le murmure ne peut pas être vide"),
});

export type IEcho = z.infer<typeof EchoSchema>;
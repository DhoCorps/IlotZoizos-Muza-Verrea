// Fichier : packages/types/src/models/resonance.types.ts
import { z } from 'zod';
import { EntityTarget } from './common.types';

/**
 * 🕸️ LES FRÉQUENCES DE RÉSONANCE
 * Définit la nature des liens dans le Graphe (Neo4j) entre les entités de l'Îlot.
 */
export type ResonanceType = 
  // --- MAILLAGE TRANSDISCIPLINAIRE HISTORIQUE ---
  | 'ILLUMINATES'       // Ex: Blog -> Projet (Le texte explique le projet)
  | 'MENTIONS'          // Ex: Blog -> E-commerce (Le texte cite un produit)
  | 'INSPIRED_BY'       // Ex: Jeu -> Task (Le jeu est né de cette tâche)
  | 'RELATES_TO'        // Lien Transversal : Atome/Oeuvre
  | 'ECHOES'            // Ex: User -> N'importe quoi (Un commentaire / retour texte)
  | 'VIBRATES'          // Ex: User -> N'importe quoi (Un Like / Emoji / Réaction)
  | 'EMBEDDED_IN'       // Ex: Produit -> Letr'In (Le produit est intégré dans une lettre)
  
  // --- NOUVEAUX FILS D'ABONNEMENT (Réseau Social & Granularité) ---
  | 'FOLLOWS_GLOBAL'    // Abonnement total à un Oiseau (Écoute complète)
  | 'FOLLOWS_SPECIFIC'  // Abonnement ciblé (uniquement à un Projet, un Sujet, etc.)
  | 'ECLIPSES';         // Masquage ciblé (Mute granulaire d'un élément précis)

/**
 * 🏷️ LES ÉTIQUETTES D'ENTITÉS (Labels Cypher Neo4j en PascalCase)
 * Enrichi avec JobQuest, KontaktProfile, Sample, Poem et LibraryBook.
 */
export const EntityLabelEnum = z.enum([
  'User', 
  'Sujet', 
  'Project', 
  'Task', 
  'Team', 
  'Product', 
  'Game', 
  'Letter',
  'Partita',
  'Store',
  'BarterOffer',
  'Order',
  'Tag',
  'JobQuest',
  'KontaktProfile',
  'Sample',
  'Poem',
  'LibraryBook'
]);

export type EntityLabel = z.infer<typeof EntityLabelEnum>;

/**
 * 🌉 Pont de correspondance entre la SSOT EntityTarget (UPPERCASE) et les Labels Neo4j (PascalCase)
 */
export const ENTITY_TARGET_TO_LABEL: Partial<Record<EntityTarget, EntityLabel>> = {
  USER: 'User',
  SUJET: 'Sujet',
  BLOG: 'Sujet',
  ARTICLE: 'Sujet',
  PROJECT: 'Project',
  TASK: 'Task',
  TEAM: 'Team',
  PRODUCT: 'Product',
  GAME: 'Game',
  FONT: 'Letter',
  SPRITE: 'Letter',
  LETRIN: 'Letter',
  PARTITA: 'Partita',
  STORE: 'Store',
  SHOP: 'Store',
  BARTER: 'BarterOffer',
  ORDER: 'Order',
  TAG: 'Tag',
  QUEST: 'JobQuest',
  PROFILE: 'KontaktProfile',
  KONTAKT: 'KontaktProfile',
  SAMPLE: 'Sample',
  SAMPLOTEK: 'Sample',
  POEM: 'Poem',
  POETRIK: 'Poem',
  BOOK: 'LibraryBook',
  BIBLIOTEK: 'LibraryBook'
};

/**
 * 📦 LE PAYLOAD DE MUTATION DE RÉSONANCE
 * Utilisé par l'Orchestrateur pour tisser ou couper un fil.
 */
export interface IResonancePayload {
  sourceUid: string;        // L'Oiseau qui agit (celui qui s'abonne ou réagit)
  targetUid: string;        // L'Oiseau cible (ou le créateur de l'entité cible)
  type: ResonanceType;      // La nature du fil à tisser/couper
  entityId?: string;        // L'ID du projet/app ciblé (Optionnel si c'est un lien GLOBAL)
}

/**
 * 📨 LA RÉPONSE DE L'API DE RÉSONANCE
 * Format unifié pour la route POST /api/users/[slug]/resonance
 */
export interface IResonanceResponse {
  success: boolean;
  message?: string;
  error?: string;
  
  // Spécifique aux Abonnements (Weave/Sever)
  isHarmonic?: boolean;     // True si la connexion est mutuelle (Naissance du lien HARMONY)
  
  // Spécifique au Calcul Historique (TaskResonanceOrchestrator)
  resonanceScore?: number; 
  activeNodes?: number;    
  echoes?: any[];          
}

/**
 * 💬 Schéma de validation pour un Écho social (avec echoType et targetLabel typé)
 */
export const EchoSchema = z.object({
  content: z.string().min(1, "Le contenu de l'écho ne peut être vide."),
  echoType: z.enum(['TEXT', 'EMOJI']),
  targetUid: z.string(),
  targetLabel: EntityLabelEnum,
});

/**
 * 🕸️ Schéma de validation pour le tissage de lien (WeaveLink avec labels et relationType)
 */
export const WeaveLinkSchema = z.object({
  sourceUid: z.string(),
  sourceLabel: EntityLabelEnum,
  targetUid: z.string(),
  targetLabel: EntityLabelEnum,
  relationType: z.string(),
  entityId: z.string().optional(),
});
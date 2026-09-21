import { z } from 'zod';

/**
 * 🌿 Modes de réception de la Canopée Tampon
 * - REALTIME : L'Oiseau reçoit l'écho en direct.
 * - DIGEST : L'Oiseau reçoit un résumé groupé à une heure précise.
 * - ZEN : Murmure de la Canopée, l'Oiseau suspend temporairement ce flux.
 */
export const DigestModeSchema = z.enum(['REALTIME', 'DIGEST', 'ZEN']);
export type DigestMode = z.infer<typeof DigestModeSchema>;

export const DigestPreferencesSchema = z.object({
  mode: DigestModeSchema.default('DIGEST'),
  // Heure locale de réception du digest (0 à 23) - Par défaut à 20h00
  digestHour: z.number().int().min(0).max(23).optional().default(20),
  timezone: z.string().default('Europe/Paris'),
});
export type IDigestPreferences = z.infer<typeof DigestPreferencesSchema>;

/**
 * 🎯 Cibles possibles d'un abonnement dans le Graphe (Neo4j)
 */
export const SubscriptionTargetTypeSchema = z.enum([
  'USER',       // S'abonner à un créateur (Tous ses flux)
  'BLOG',       // S'abonner à un monologue de l'AbyssBlog
  'PROJECT',    // Suivre l'avancée d'un Chantier
  'GAME',       // Suivre les mises à jour d'un jeu
  'FONT',       // Letr'In
  'SPRITE',     // Pixel art
  'LYRIKA',     // Paroles
  'SAMPLOTEK',  // Audio
  'BIBLIOTEK',  // Sanctuaire des ouvrages
  'POETRIK'     // Poésie
]);
export type SubscriptionTargetType = z.infer<typeof SubscriptionTargetTypeSchema>;

/**
 * 🔗 Schéma principal de la relation d'abonnement (FOLLOWS)
 */
export const SubscriptionSchema = z.object({
  subscriberUid: z.string().uuid("L'UID de l'Oiseau abonné doit être un UUID valide."),
  targetUid: z.string().uuid("L'UID de la cible doit être un UUID valide."),
  targetType: SubscriptionTargetTypeSchema,
  
  // Si non fourni, l'Oiseau hérite des paramètres par défaut (Digest à 20h00)
  digestPreferences: DigestPreferencesSchema.default({
    mode: 'DIGEST',
    digestHour: 20,
    timezone: 'Europe/Paris'
  }),
  
  createdAt: z.date().optional(),
});

export type ISubscription = z.infer<typeof SubscriptionSchema>;
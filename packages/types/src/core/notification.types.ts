import { z } from 'zod';

/**
 * 🎨 Catégories Sémantiques des Notifications (Pour la Pulsation des Flux UI)
 * - TEXT: Émeraude (AbyssBlog, Bibliotek, Letr'In)
 * - AUDIO: Corail (SamploTek, Lyrika)
 * - VISUAL: Cyan (Sprite, Design)
 * - SOCIAL: Violet/Or (Abonnements, Échos, Sceau de l'Érudit)
 * - SYSTEM: Gris (Alertes Matrice)
 * - DIGEST: Multi-couleurs (Résumé intelligent de la Canopée)
 */
export const NotificationCategorySchema = z.enum([
  'TEXT',
  'AUDIO',
  'VISUAL',
  'SOCIAL',
  'SYSTEM',
  'DIGEST'
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

/**
 * 🧩 Charge utile (Payload) dynamique de la notification
 * Conçue pour permettre l'Écho Intelligent (Regroupement de plusieurs actions)
 */
export const NotificationPayloadSchema = z.object({
  title: z.string().optional(),
  
  // On ajoute { required_error: ... } pour gérer l'absence totale du champ
  message: z.string({ required_error: "Le message de l'alerte ne peut être vide." })
            .min(1, "Le message de l'alerte ne peut être vide."),
            
  targetUrl: z.string().optional(),
  targetUid: z.string().uuid().optional(),
  targetType: z.string().optional(),
  groupedCount: z.number().int().min(1).optional(), 
});

/**
 * 🔔 Schéma principal de la Notification (L'Oiseau Facteur)
 */
export const NotificationSchema = z.object({
  uid: z.string().uuid("L'UID de la notification doit être un UUID valide."),
  
  // L'Oiseau qui reçoit l'alerte
  recipientUid: z.string().uuid("L'UID du récepteur est requis."),
  
  // L'Oiseau qui a déclenché l'action (Optionnel pour les alertes de la matrice ou les Digests)
  senderUid: z.string().uuid().optional().nullable(),
  
  category: NotificationCategorySchema.default('SYSTEM'),
  type: z.string(), // Sous-type métier (ex: 'NEW_ECHO', 'NEW_PUBLICATION', 'DAILY_SUMMARY')
  
  payload: NotificationPayloadSchema,
  
  isRead: z.boolean().default(false),
  
  // 🌿 Le cœur de la Canopée Tampon : 
  // Si null/undefined, la notification est immédiate.
  // Sinon, elle reste invisible dans la base de données jusqu'à cette heure précise.
  scheduledFor: z.date().optional().nullable(),
  
  createdAt: z.date().optional(),
});

export type INotification = z.infer<typeof NotificationSchema>;
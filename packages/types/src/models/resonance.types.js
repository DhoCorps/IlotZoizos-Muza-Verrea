import { z } from 'zod';
// Enum Zod correspondant aux labels d'entités pour les validations
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
    'Tag'
]);
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

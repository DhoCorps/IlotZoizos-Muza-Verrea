// packages/types/src/models/moderation.types.ts
import { z } from 'zod';
/**
 * 🛡️ MODÉRATION & BIEN-ÊTRE MENTAL
 * Définitions strictes pour la gestion des conflits et la protection du Nexus.
 */
// 🛡️ SUTURE ZODIQUE : Schémas pour garantir l'intégrité de la modération
export const ModerationSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ModerationActionSchema = z.enum(['WARN', 'EXILE', 'BURN', 'SUPPORT_TICKET']);
export const ModerationRequestSchema = z.object({
    targetId: z.string(),
    targetType: z.enum(['USER', 'FRAGMENT', 'PROJECT']),
    reason: z.string().min(5, "La raison de la modération est trop succincte."),
    severity: ModerationSeveritySchema,
    reportedBy: z.string().optional(),
    context: z.record(z.any()).optional(),
});
export const ModerationResponseSchema = z.object({
    success: z.boolean(),
    actionTaken: z.union([ModerationActionSchema, z.literal('PENDING')]).optional(),
    ticketId: z.string().optional(),
    message: z.string(),
    timestamp: z.string().datetime().optional(), // ISO string validé
    flagged: z.boolean().optional(),
});

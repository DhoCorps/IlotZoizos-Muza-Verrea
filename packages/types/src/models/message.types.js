// packages/types/src/models/message.types.ts
import { z } from 'zod';
export const RawAttachmentPointerSchema = z.object({
    sourceType: z.string().min(1, "Type de source requis."),
    entitySlug: z.string().min(1, "Slug de l'entité requis.")
});
export const UniversalAttachmentSchema = z.object({
    sourceType: z.string(),
    entitySlug: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    targetRoute: z.string()
});
export const SendMessageBodySchema = z.object({
    conversationSlug: z.string().min(1, "Salon introuvable."),
    content: z.string().optional().default(''),
    rawAttachments: z.array(RawAttachmentPointerSchema).optional().default([]),
    replyToSlug: z.string().optional()
});

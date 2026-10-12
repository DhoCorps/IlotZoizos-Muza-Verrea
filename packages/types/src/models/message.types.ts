// Fichier : packages/types/src/models/message.types.ts
import { z } from 'zod';
import { EntityTargetEnum, EntityTarget } from './common.types';

// 🌌 Alignement strict sur la SSOT EntityTargetEnum (remplace l'union ouverte '... | string')
export const AttachmentSourceTypeSchema = EntityTargetEnum;
export type AttachmentSourceType = EntityTarget;

/**
 * Pointeur brut envoyé par le client (léger et sécurisé).
 * Le client transmet uniquement l'intention de partage via le slug de l'entité.
 */
export interface IRawAttachmentPointer {
  sourceType: AttachmentSourceType;
  entitySlug: string;
}

export const RawAttachmentPointerSchema = z.object({
  sourceType: EntityTargetEnum,
  entitySlug: z.string().min(1, "Slug de l'entité requis.")
});

/**
 * Attachement universel résolu complet (stocké en base de données - La Silice).
 */
export interface IUniversalAttachment {
  sourceType: AttachmentSourceType;
  entitySlug: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  targetRoute: string;
}

export const UniversalAttachmentSchema = z.object({
  sourceType: EntityTargetEnum,
  entitySlug: z.string().min(1, "Slug de l'entité requis."),
  title: z.string(),
  subtitle: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  targetRoute: z.string()
});

/**
 * Structure des réactions par émojis sur un message.
 */
export interface IMessageReaction {
  emoji: string;
  userSlugs: string[];
}

/**
 * Suivi granulaire des lectures (Reçus de lecture).
 */
export interface IMessageReadReceipt {
  userSlug: string;
  readAt: Date;
}

/**
 * Payload de création de message reçu par l'API (POST /api/messages).
 */
export interface IMessagePayload {
  conversationSlug: string;
  content?: string;
  rawAttachments?: IRawAttachmentPointer[];
  replyToSlug?: string;
}

export const SendMessageBodySchema = z.object({
  conversationSlug: z.string().min(1, "Salon introuvable."),
  content: z.string().optional().default(''),
  rawAttachments: z.array(RawAttachmentPointerSchema).optional().default([]),
  replyToSlug: z.string().optional()
});

// 🛡️ Export explicite du type inféré pour satisfaire l'import de la route
export type SendMessageBody = z.infer<typeof SendMessageBodySchema>;
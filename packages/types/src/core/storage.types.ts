// Fichier : packages/types/src/core/storage.types.ts
import { z } from 'zod';

/**
 * 🗄️ Dossiers d'entités S3 / Cloudflare R2 (Conserve strictement le pluriel minuscule)
 */
export const StorageEntityTypeEnum = z.enum([
  'users',
  'teams',
  'projects',
  'tasks',
  'sujets',
  'products',
  'stores',
  'templates',
  'fonts',
  'partitas',
  'messages',
  'barters'
]);

export type StorageEntityType = z.infer<typeof StorageEntityTypeEnum>;

export interface StructuredKeyOptions {
  inceptId: string;
  locale: string;
  entityType: StorageEntityType;
  entityId: string;
  imageType: string;
  filename: string;
}

export const StructuredKeyOptionsSchema = z.object({
  inceptId: z.string().min(1, "L'identifiant de l'incept est requis."),
  locale: z.string().min(2, "La locale est requise."),
  entityType: StorageEntityTypeEnum,
  entityId: z.string().min(1, "L'identifiant de l'entité est requis."),
  imageType: z.string().min(1, "Le type d'image ou d'artefact est requis."),
  filename: z.string().min(1, "Le nom de fichier est requis.")
});
// Fichier : packages/types/src/core/annotation.types.ts
import { z } from 'zod';
import { EntityTargetEnum, EntityTarget } from '../models/common.types';

// 🌌 Alignement sur la SSOT EntityTargetEnum (inclut BOOK, ARTICLE, COMMENT, POEM, SUJET, PARTITA...)
export const AnnotationTargetTypeSchema = EntityTargetEnum;
export type AnnotationTargetType = EntityTarget;

export interface IUniversalAnnotation {
  uid: string;
  targetUid: string;
  targetType: AnnotationTargetType;
  targetTitle?: string;
  authorUid: string;
  selectedText: string;
  comment?: string;
  importance?: number;
  emotion?: string;
  chapterReference?: string | null;
  isScholarSealed?: boolean;
  createdAt?: Date; // ⏳ Sécurisé : Seulement Date après validation
  updatedAt?: Date; // ⏳ Sécurisé : Seulement Date après validation
}

export interface ICreateUniversalAnnotationInput {
  targetUid: string;
  targetType: AnnotationTargetType;
  targetTitle?: string;
  selectedText: string;
  comment?: string;
  importance?: number;
  emotion?: string;
  chapterReference?: string | null;
}

export const UniversalAnnotationSchema = z.object({
  uid: z.string().min(1),
  targetUid: z.string().min(1),
  targetType: AnnotationTargetTypeSchema,
  targetTitle: z.string().optional(),
  authorUid: z.string().min(1),
  selectedText: z.string().min(1),
  comment: z.string().optional(),
  importance: z.number().min(1).max(5).optional(),
  emotion: z.string().optional(),
  chapterReference: z.string().nullable().optional(),
  isScholarSealed: z.boolean().optional().default(false),
  createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date
  updatedAt: z.coerce.date().optional(), // ⏳ Harmonisation Date
});

export const CreateUniversalAnnotationInputSchema = UniversalAnnotationSchema.omit({
  uid: true,
  authorUid: true,
  isScholarSealed: true,
  createdAt: true,
  updatedAt: true,
});
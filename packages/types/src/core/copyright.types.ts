// Fichier : packages/types/src/core/copyright.types.ts
import { z } from 'zod';

// ==========================================
// PACTE DE FILIATION (NOUVEAU)
// ==========================================
export const FiliationClaimStatusSchema = z.enum([
  'PENDING_CLAIM', 
  'SHARED', 
  'REVOKED'
]);

export const FiliationSourceSchema = z.object({
  isExternalSource: z.boolean(),
  sourceAuthorName: z.string().min(1, "Le nom de l'auteur source est requis"),
  sourceWorkTitle: z.string().min(1, "Le titre de l'œuvre source est requis"),
  sourceReferenceUrl: z.string().url().or(z.literal('')).optional(),
  claimStatus: FiliationClaimStatusSchema.default('PENDING_CLAIM'),
  escrowBalance: z.number().min(0).default(0),
  derivativeType: z.string().optional()
});

// ==========================================
// COPYRIGHT & RÔLES ARTISTIQUES (DRY)
// ==========================================
export const CopyrightRoleSchema = z.enum(['CREATOR', 'SUBLIMATOR', 'CURATOR']);

export const CopyrightMetadataSchema = z.object({
  role: CopyrightRoleSchema.default('CREATOR'),
  originalAuthor: z.string().optional(),
  originalWorkTitle: z.string().optional(),
  sublimationNotes: z.string().optional(),
  isExclusiveIlot: z.boolean().default(false),
  filiation: FiliationSourceSchema.optional() // 🚀 Injection du Pacte de Filiation
});

// ==========================================
// EXPORT DES TYPES INFÉRÉS
// ==========================================
export type CopyrightRole = z.infer<typeof CopyrightRoleSchema>;
export type FiliationClaimStatus = z.infer<typeof FiliationClaimStatusSchema>;
export type IFiliationSource = z.infer<typeof FiliationSourceSchema>;
export type CopyrightMetadata = z.infer<typeof CopyrightMetadataSchema>;
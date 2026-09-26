import { z } from 'zod';

// ==========================================
// PACTE DE FILIATION
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
  license: z.string().default('MIT / Libre Canopée'),
  filiation: FiliationSourceSchema.optional()
});

// ==========================================
// EXPORT DES TYPES ET INTERFACES
// ==========================================
export type CopyrightRole = z.infer<typeof CopyrightRoleSchema>;
export type FiliationClaimStatus = z.infer<typeof FiliationClaimStatusSchema>;
export type IFiliationSource = z.infer<typeof FiliationSourceSchema>;

// 🪡 FIX DÉFINITIF : Interface explicite où `role` et `isExclusiveIlot` sont requis 
// pour les orchestrateurs, mais `license` est optionnel pour tolérer les objets de test.
export interface CopyrightMetadata {
  role: CopyrightRole;
  isExclusiveIlot: boolean;
  license?: string;
  originalAuthor?: string;
  originalWorkTitle?: string;
  sublimationNotes?: string;
  filiation?: IFiliationSource;
}
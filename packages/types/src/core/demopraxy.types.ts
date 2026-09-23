import { z } from 'zod';

// ==========================================
// 🛡️ ÉNUMÉRATION DES CATÉGORIES DE DÉRIVES & SANCTIONS
// ==========================================
export const SanctionCategorySchema = z.enum([
  'SYSTEMIC_HATRED',
  'MANIPULATION',
  'TOXICITY',
  'HARASSMENT',
  'DISINFORMATION',
  'CUSTOM'
]);

export type SanctionCategory = z.infer<typeof SanctionCategorySchema>;

// ==========================================
// 📋 INTERFACE DE L'ENREGISTREMENT DÉMOPRAXIQUE (Registre de Justice)
// ==========================================
export interface IDemopraxicRecord {
  uid: string;
  userIdentifier: string; // Slug ou UID de l'oiseau évalué/sanctionné
  actorUid: string;       // UID du gardien ou de l'instance souveraine
  metrics: {
    systemicHatredScore: number;
    recurrenceCount: number;
    recalibrationCapacity: number;
    collectiveResonance: number;
    computedEx: number;   // Indice d'exclusion calculé (Ex)
  };
  sanctionCategory: SanctionCategory;
  tags: string[];
  isExcluded: boolean;
  actionMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// 📄 CONTRAT DE FILTRAGE ET DE PAGINATION
// ==========================================
export interface DemopraxyPaginationQuery {
  page?: number;
  limit?: number;
  sanctionCategory?: SanctionCategory | 'ALL';
  tag?: string;
  isExcluded?: boolean;
}
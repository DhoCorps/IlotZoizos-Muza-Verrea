import { z } from 'zod';
// On importe l'énumération des entités que nous avons créée dans le Sujet
import { ExtendedEntityTypeSchema } from './sujet.types'; 

// ==========================================
// 1. ÉNUMÉRATIONS
// ==========================================
export const PropagationScopeSchema = z.enum([
  'TARGETED', // Partage ciblé à une liste de contacts
  'GLOBAL'    // Diffusion à l'ensemble du réseau de second degré
]);

export type PropagationScope = z.infer<typeof PropagationScopeSchema>;

// ==========================================
// 2. SOUS-SCHÉMA : MÉTRIQUES DE QUALITÉ (Ratio de Retour)
// ==========================================
export const PropagationMetricsSchema = z.object({
  merciCount: z.number().default(0), // Les retours positifs ("Merci", interactions)
  noiseCount: z.number().default(0), // Les retours ignorés, neutres ou négatifs
  returnRatio: z.number().default(0) // Ratio calculé : merciCount / (merciCount + noiseCount)
});

// ==========================================
// 3. SCHÉMA PRINCIPAL : L'ÉVÉNEMENT DE PARTAGE
// ==========================================
export const ShareEventSchema = z.object({
  uid: z.string().uuid("L'UID de l'événement doit être un UUID valide"),
  
  // CORRECTION ICI : Les messages reflètent bien une erreur de format UUID
  sourceUid: z.string().uuid("L'UID de l'Oiseau source doit être un UUID valide"),
  artifactUid: z.string().uuid("L'UID de l'œuvre cible doit être un UUID valide"),
  
  artifactType: ExtendedEntityTypeSchema,
  
  // La portée et la liste des destinataires
  scope: PropagationScopeSchema.default('GLOBAL'),
  receiverUids: z.array(z.string().uuid("Chaque destinataire doit avoir un UUID valide")).default([]),
  
  // Un petit mot facultatif pour accompagner le partage
  customMessage: z.string().max(500, "Le message d'accompagnement est limité à 500 caractères").optional(),
  
  // La télémétrie de la qualité
  metrics: PropagationMetricsSchema.default({}),
  
  createdAt: z.date().optional(),
})
// 🛡️ SUPER-VALIDATION MÉTIER : Cohérence entre la portée et les destinataires
.refine(data => {
  // Si le partage est ciblé, la liste des récepteurs ne peut pas être vide
  if (data.scope === 'TARGETED' && data.receiverUids.length === 0) {
    return false;
  }
  // Si le partage est global, la liste des récepteurs doit être vide
  if (data.scope === 'GLOBAL' && data.receiverUids.length > 0) {
    return false;
  }
  return true;
}, {
  message: "Incohérence du Kosmos : Un partage ciblé exige des destinataires, un partage global n'en accepte aucun.",
  path: ["receiverUids"] // L'erreur sera attachée à ce champ
});

export type ShareEvent = z.infer<typeof ShareEventSchema>;
export type PropagationMetrics = z.infer<typeof PropagationMetricsSchema>;
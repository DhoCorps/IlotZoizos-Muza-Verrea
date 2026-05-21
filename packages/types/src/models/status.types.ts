// packages/types/src/models/status.types.ts
import { z } from 'zod';

/**
 * 🛡️ SUTURE ZODIQUE : Le contrat des Statuts
 */
export const StatusValueSchema = z.enum([
  'CONCEPT', 
  'TODO', 
  'IN_PROGRESS', 
  'BLOCKED', 
  'DONE', 
  'ARCHIVED', 
  'REDUCED_SPEED', 
  'CANCELLED'
]);

export const StatusSchema = z.object({
  uid: z.string(),
  label: z.string(),
  value: StatusValueSchema, // Verrouillé par l'enum Zod
  color: z.string(),
  order: z.number().int().nonnegative(), // Garantit un ordre positif
});

// 🔄 INFERENCE : Génération automatique du type TypeScript
export type IStatus = z.infer<typeof StatusSchema>;
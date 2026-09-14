import { z } from 'zod';

/**
 * Standardise la réponse d'un Upload réussi vers le Nexus R2.
 * Version interface pure : Légère et sans logique de classe.
 */
export interface UploadResponseDto {
  success: boolean;
  message: string;
  /**
   * La clef (Key/Path) complète dans le Bucket R2.
   */
  key: string;
  /**
   * L'URL publique visible par le Front (r2.dev).
   */
  publicUrl: string;
  etag?: string; // Identifiant unique S3 du fichier.
}

/**
 * Schéma Zod pour valider la structure d'une réponse d'upload au runtime.
 */
export const UploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().min(1, "Un message de confirmation est requis."),
  key: z.string().min(1, "La clé de stockage R2 est obligatoire."),
  publicUrl: z.string().url("L'URL publique doit être valide."),
  etag: z.string().optional(),
});
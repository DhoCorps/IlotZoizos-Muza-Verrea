// apps/hub-central/modules/storage/dto/upload-response.dto.ts

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
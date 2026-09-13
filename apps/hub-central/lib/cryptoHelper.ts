// apps/hub-central/lib/cryptoHelper.ts (ou dans packages/shared-core/src/utils/)
import crypto from 'crypto';

/**
 * Génère une empreinte numérique SHA-256 unique à partir d'un buffer de fichier brut.
 * Cette empreinte sert de preuve mathématique d'antériorité pour l'auteur.
 */
export function generateFileHash(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) {
    throw new Error("Impossible de forger le Sceau : le buffer du fichier est vide.");
  }

  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}
import * as crypto from 'crypto';

/**
 * 🔐 Génère un hachage SHA-256 unifié pour un contenu ou un buffer de fichier.
 * Utilisé pour l'intégrité, la déduplication et l'empreinte unique des artefacts de l'Îlot.
 */
export function generateFileHash(fileContent: Buffer | string): string {
  if (!fileContent) {
    throw new Error('🔥 [Crypto Error] Un buffer ou un contenu valide est requis pour générer le hash SHA-256.');
  }

  const data = typeof fileContent === 'string' ? Buffer.from(fileContent, 'utf-8') : fileContent;

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}
import * as crypto from 'crypto';
import { CopyrightMetadata, CopyrightRole } from '@ilot/types';

/**
 * 🔐 Génère un hachage SHA-256 unifié pour un contenu ou un buffer de fichier.
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

/**
 * Nettoie, valide et applique les règles métiers du Copyright de la Canopée.
 */
export function sanitizeCopyright(meta?: Partial<CopyrightMetadata>): CopyrightMetadata {
  const defaultRole: CopyrightRole = 'CREATOR';
  
  if (!meta) {
    return { role: defaultRole, isExclusiveIlot: false };
  }

  const role = meta.role || defaultRole;
  const isExclusiveIlot = role === 'CURATOR' ? false : (meta.isExclusiveIlot || false);

  return {
    role,
    originalAuthor: meta.originalAuthor?.trim(),
    originalWorkTitle: meta.originalWorkTitle?.trim(),
    sublimationNotes: meta.sublimationNotes?.trim(),
    isExclusiveIlot
  };
}

/**
 * Traduit le rôle de l'artiste en un lien de parenté dynamique pour le Graphe Neo4j.
 */
export function getCopyrightCypherRelation(role: CopyrightRole | string): string {
  switch (role) {
    case 'SUBLIMATOR':
      return 'SUBLIMATES';
    case 'CURATOR':
      return 'CURATES';
    case 'CREATOR':
    default:
      return 'CREATED';
  }
}

/**
 * 🛡️ Sceau Canopique Unifié : Scelle le contenu du fichier ET ses métadonnées de copyright 
 * en une seule empreinte SHA-256 infalsifiable.
 */
export function generateCanopySeal(fileContent: Buffer | string, copyright: CopyrightMetadata): string {
  const cleanCopyright = sanitizeCopyright(copyright);
  
  // On combine le contenu brut du fichier avec la structure JSON canonique du copyright
  const contentHash = generateFileHash(fileContent);
  const metadataPayload = JSON.stringify({
    contentHash,
    role: cleanCopyright.role,
    originalAuthor: cleanCopyright.originalAuthor || '',
    originalWorkTitle: cleanCopyright.originalWorkTitle || '',
    isExclusiveIlot: cleanCopyright.isExclusiveIlot
  });

  // Le sceau final englobe à la fois l'œuvre et sa souveraineté juridique/artistique
  return generateFileHash(metadataPayload);
}
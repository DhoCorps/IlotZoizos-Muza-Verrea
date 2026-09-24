import { CopyrightMetadata, CopyrightRole } from '@ilot/types';

/**
 * Nettoie, valide et applique les règles métiers du Copyright de la Canopée.
 */
export function sanitizeCopyright(meta?: Partial<CopyrightMetadata>): CopyrightMetadata {
  const defaultRole: CopyrightRole = 'CREATOR';
  
  if (!meta) {
    return { role: defaultRole, isExclusiveIlot: false };
  }

  const role = meta.role || defaultRole;
  
  // 🛡️ Règle métier stricte : Un simple relayeur (Curateur) ne peut revendiquer une exclusivité Îlot.
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
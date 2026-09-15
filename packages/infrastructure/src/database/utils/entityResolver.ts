import { Model } from 'mongoose';

/**
 * 🔍 Recherche unifiée d'une entité par son UID ou son Slug.
 * Permet de garantir une robustesse maximale pour toutes les routes d'API.
 */
export async function findEntityBySlugOrUid<T>(
  model: Model<T>,
  identifier: string,
  options: { lean?: boolean } = { lean: true }
): Promise<T | null> {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const cleanId = identifier.trim();
  if (!cleanId) {
    return null;
  }

  const query = {
    $or: [
      { uid: cleanId },
      { slug: cleanId }
    ]
  };

  try {
    const queryChain = model.findOne(query);
    if (options.lean) {
      return (await queryChain.lean()) as T | null;
    }
    return (await queryChain.exec()) as T | null;
  } catch (error) {
    console.error(`🔥 [EntityResolver Error] Échec de la recherche pour "${cleanId}":`, error);
    return null;
  }
}
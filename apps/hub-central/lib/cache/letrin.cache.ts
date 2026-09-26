import { unstable_cache } from 'next/cache';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Recensement des polices/sprites
// -------------------------------------------------------------------------
export async function getCachedFonts() {
  const fetcher = async () => {
    // 🔍 Utilisation du modèle maître unifié
    return await LetrinFontSpriteModel.find({}).sort({ createdAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    ['letrin-fonts-list'],
    { revalidate: 60, tags: ['fonts', 'letrin', 'font-projects'] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Récupération d'une police par slug
// -------------------------------------------------------------------------
export async function getCachedFontDetail(slug: string) {
  const fetcher = async () => {
    // 🔍 Utilisation du modèle maître unifié
    return await LetrinFontSpriteModel.findOne({ slug }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    [`letrin-font-${slug}`],
    { revalidate: 60, tags: ['fonts', 'letrin', 'font-projects', `font-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Recensement des projets de police
// -------------------------------------------------------------------------
export async function getCachedFontProjects() {
  const fetcher = async () => {
    // 🔍 Utilisation du modèle maître unifié
    return await LetrinFontSpriteModel.find({}).sort({ updatedAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    ['letrin-font-projects-list'],
    { revalidate: 60, tags: ['fonts', 'font-projects', 'letrin'] }
  )();
}
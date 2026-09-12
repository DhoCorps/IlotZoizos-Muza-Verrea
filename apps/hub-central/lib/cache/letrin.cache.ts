// Fichier : lib/cache/letrin.cache.ts
import { unstable_cache } from 'next/cache';
import { LetterSpriteModel, FontProject } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Recensement des polices/sprites
// -------------------------------------------------------------------------
export async function getCachedFonts() {
  const fetcher = async () => {
    return await LetterSpriteModel.find({}).sort({ createdAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    ['letrin-fonts-list'],
    { revalidate: 60, tags: ['fonts', 'letrin'] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Récupération d'une police par slug
// -------------------------------------------------------------------------
export async function getCachedFontDetail(slug: string) {
  const fetcher = async () => {
    return await LetterSpriteModel.findOne({ slug }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    [`letrin-font-${slug}`],
    { revalidate: 60, tags: ['fonts', 'letrin', `font-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Recensement des projets de police
// -------------------------------------------------------------------------
export async function getCachedFontProjects() {
  const fetcher = async () => {
    return await FontProject.find({}).sort({ updatedAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    ['letrin-font-projects-list'],
    { revalidate: 60, tags: ['fonts', 'font-projects'] }
  )();
}
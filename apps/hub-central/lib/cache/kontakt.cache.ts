// Fichier : lib/cache/kontakt.cache.ts
import { unstable_cache } from 'next/cache';
import { CVTemplateModel, JobQuestModel, KontaktProfileModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// CACHE : Récupération des templates de CV
// -------------------------------------------------------------------------
export async function getCachedTemplates(authorUid?: string | null) {
  const fetcher = async () => {
    const query: Record<string, unknown> = {};
    if (authorUid) query.authorUid = authorUid;
    return await CVTemplateModel.find(query).sort({ createdAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  const cacheKey = authorUid ? `cv-templates-${authorUid}` : 'cv-templates-all';
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['cv-templates', ...(authorUid ? [`author-${authorUid}`] : [])] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Récupération d'un template spécifique par son slug
// -------------------------------------------------------------------------
export async function getCachedTemplateDetail(slug: string) {
  const fetcher = async () => {
    return await CVTemplateModel.findOne({ slug }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    [`kontakt-template-${slug}`],
    { revalidate: 60, tags: ['cv-templates', 'kontakt-templates', `template-${slug}`] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Recensement des quêtes actives
// -------------------------------------------------------------------------
export async function getCachedActiveQuests() {
  const fetcher = async () => {
    return await JobQuestModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  return await unstable_cache(
    fetcher,
    ['kontakt-active-quests'],
    { revalidate: 60, tags: ['job-quests', 'kontakt-quests'] }
  )();
}

// -------------------------------------------------------------------------
// CACHE : Recensement des profils Kontakt
// -------------------------------------------------------------------------
export async function getCachedKontaktProfiles(alignment?: string | null, status?: string | null) {
  const fetcher = async () => {
    const query: Record<string, unknown> = {};
    if (alignment) query.alignment = alignment;
    if (status) query.availabilityStatus = status;
    return await KontaktProfileModel.find(query).sort({ createdAt: -1 }).lean();
  };
  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }
  const cacheKey = `kontakt-profiles-${alignment || 'all'}-${status || 'all'}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['kontakt-profiles', ...(alignment ? [`alignment-${alignment}`] : []), ...(status ? [`status-${status}`] : [])] }
  )();
}
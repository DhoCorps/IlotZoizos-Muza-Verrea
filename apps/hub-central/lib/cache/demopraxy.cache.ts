import { unstable_cache } from 'next/cache';
import { OiseauModel } from '@ilot/infrastructure';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import { SanctionCategory } from '@ilot/types';

interface LeanOiseauDocument {
  uid: string;
  slug: string;
  sanctuaryVerrouille?: boolean;
  demopraxyState?: unknown;
  [key: string]: unknown;
}

// -------------------------------------------------------------------------
// CACHE CHIRURGICAL : Récupération des métriques et rapports démopraxiques
// -------------------------------------------------------------------------
export async function getCachedDemopraxicMetrics(userIdentifier: string) {
  const fetcher = async () => {
    if (!userIdentifier) throw new Error("Identifiant d'oiseau requis pour ausculter la démopraxy.");
    
    const user = await OiseauModel.findOne({ 
      $or: [{ slug: userIdentifier }, { uid: userIdentifier }, { pseudo: userIdentifier }] 
    }).lean() as LeanOiseauDocument | null;

    if (!user) {
      throw new Error("Oiseau introuvable dans la Silice pour auscultation démopraxique.");
    }

    return {
      uid: user.uid,
      slug: user.slug,
      sanctuaryVerrouille: user.sanctuaryVerrouille || false,
      demopraxyState: user.demopraxyState || null
    };
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `demopraxy-metrics-${userIdentifier}`;
  
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['demopraxy', `demopraxy-${userIdentifier}`] }
  )();
}

// -------------------------------------------------------------------------
// CACHE CHIRURGICAL : Récupération du registre démopraxique (Pagination & Filtres)
// -------------------------------------------------------------------------
export async function getCachedDemopraxicRegister(params: {
  page: number;
  limit: number;
  sanctionCategory?: SanctionCategory | 'ALL';
  tag?: string;
  isExcluded?: boolean;
}) {
  const fetcher = async () => {
    const orchestrator = new DemopraxyOrchestrator();
    return await orchestrator.getDemopraxicRegister(params);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const { page, limit, sanctionCategory = 'ALL', tag = 'none', isExcluded = 'all' } = params;
  const cacheKey = `demopraxy-register-${page}-${limit}-${sanctionCategory}-${tag}-${isExcluded}`;

  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 60, tags: ['demopraxy', 'demopraxy-register'] }
  )();
}
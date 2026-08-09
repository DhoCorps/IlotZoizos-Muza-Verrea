export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ShowcaseOrchestrator } from '@ilot/shared-core';
import { UniversalMediaType } from '@ilot/types';
import { unstable_cache } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass automatique en mode test
async function getCachedStream(userUid: string, filters: any) {
  const fetcher = async () => {
    return await ShowcaseOrchestrator.getPersonalizedShowcase(userUid, filters);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `showcase-stream-${userUid}-${filters.selectedApps.join('-')}-${filters.onlyTradable}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['showcase', `showcase-${userUid}`] }
  )();
}

// ==========================================
// 🌌 GET : Générer le Flux du Diaporama (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    
    // Identification sécurisée de l'oiseau par son jeton (on ignore le paramètre URL pour la sécurité)
    const userUid = currentUser.uid || currentUser.id; 

    // Extraction et CASTING des filtres granulaires depuis l'URL
    const appsParam = searchParams.get('apps');
    const selectedApps = appsParam ? (appsParam.split(',') as UniversalMediaType[]) : [];
    const onlyTradable = searchParams.get('onlyTradable') === 'true';

    const filters = {
      selectedApps,
      onlyTradable
    };

    // 🎬 Tissage du flux personnalisé mis en cache
    const playlist = await getCachedStream(userUid, filters);

    return NextResponse.json({
      success: true,
      data: playlist,
      count: playlist.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [SHOWCASE STREAM ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne lors du tissage du flux." }, { status });
  }
});
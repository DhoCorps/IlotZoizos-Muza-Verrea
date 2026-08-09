export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SampleModel } from '@ilot/infrastructure';
import { ISample } from '@ilot/types';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Récupération rapide de la banque de sons (30s)
async function getCachedSamples(): Promise<ISample[]> {
  const fetcher = async (): Promise<ISample[]> => {
    const rawSamples = await SampleModel.find({}).sort({ createdAt: -1 }).lean();
    return rawSamples as unknown as ISample[];
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['samplotek-samples-library'],
    { revalidate: 30, tags: ['samples'] }
  )();
}

// ==========================================
// 🔍 GET : Rechercher et filtrer les samples de la banque
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const style = url.searchParams.get('style');
    const musicalKey = url.searchParams.get('musicalKey');
    const minBpm = url.searchParams.get('minBpm');
    const maxBpm = url.searchParams.get('maxBpm');

    let samples: ISample[] = await getCachedSamples();

    // Filtres dynamiques sur les attributs stricts typés
    if (style && style !== 'ALL') {
      samples = samples.filter((s) => s.style.toLowerCase() === style.toLowerCase());
    }
    if (musicalKey && musicalKey !== 'ALL') {
      samples = samples.filter((s) => s.musicalKey.toLowerCase() === musicalKey.toLowerCase());
    }
    if (minBpm) {
      const min = Number(minBpm);
      samples = samples.filter((s) => s.tempoBpm >= min);
    }
    if (maxBpm) {
      const max = Number(maxBpm);
      samples = samples.filter((s) => s.tempoBpm <= max);
    }

    return NextResponse.json({ success: true, data: samples }, { status: 200 });

  } catch (error: unknown) {
    console.error('🔥 [SAMPLE SEARCH ERROR] :', error);
    const err = error as { status?: number; statusCode?: number; message?: string };
    const status = err.status || err.statusCode || 500;
    return NextResponse.json({ success: false, error: err.message || 'Erreur interne de la recherche.' }, { status });
  }
});
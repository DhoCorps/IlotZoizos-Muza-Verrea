// apps/hub-central/app/api/samplotek/search/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ISample } from '@ilot/types';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';

export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const style = url.searchParams.get('style');
    const musicalKey = url.searchParams.get('musicalKey');
    const minBpm = url.searchParams.get('minBpm');
    const maxBpm = url.searchParams.get('maxBpm');

    let samples: ISample[] = await getCachedSamples();

    // Filtres dynamiques
    if (style && style !== 'ALL') {
      samples = samples.filter((s) => s.style.toLowerCase() === style.toLowerCase());
    }
    if (musicalKey && musicalKey !== 'ALL') {
      samples = samples.filter((s) => s.musicalKey.toLowerCase() === musicalKey.toLowerCase());
    }
    if (minBpm) {
      samples = samples.filter((s) => s.tempoBpm >= Number(minBpm));
    }
    if (maxBpm) {
      samples = samples.filter((s) => s.tempoBpm <= Number(maxBpm));
    }

    return NextResponse.json({ success: true, data: samples }, { status: 200 });
  } catch (error: any) {
    console.error('🔥 [SAMPLE SEARCH ERROR] :', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur interne de la recherche.' }, { status: error.status || 500 });
  }
});
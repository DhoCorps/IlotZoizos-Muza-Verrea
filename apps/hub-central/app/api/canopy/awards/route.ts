export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CanopyAwardModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass en mode test
async function getCachedAwards(yearMonth?: string) {
  const query = yearMonth ? { yearMonth } : {};
  const fetcher = async () => {
    return await CanopyAwardModel.find(query).sort({ createdAt: -1 }).lean().exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`canopy-awards-${yearMonth || 'all'}`],
    { revalidate: 1800, tags: ['canopy-awards'] }
  )();
}

// ==========================================
// 🦅 GET : Récupérer les trophées de la Canopée
// ==========================================
export const GET = withSilice(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const yearMonth = url.searchParams.get('yearMonth') || undefined;

    const awards = await getCachedAwards(yearMonth);
    return NextResponse.json({ success: true, awards }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 [CANOPY AWARDS ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne lors de la récupération des trophées." },
      { status }
    );
  }
});
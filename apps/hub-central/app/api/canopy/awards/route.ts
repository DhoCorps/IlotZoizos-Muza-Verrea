// Fichier : app/api/canopy/awards/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice } from '@/lib/api-guards';
import { getCachedAwards } from '@/lib/cache/canopy.cache';

export const GET = withSilice(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const yearMonth = url.searchParams.get('yearMonth') || undefined;
    const awards = await getCachedAwards(yearMonth);
    return NextResponse.json({ success: true, awards }, { status: 200 });
  } catch (error: any) {
    console.error("  [CANOPY AWARDS ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne lors de la récupération des trophées." },
      { status }
    );
  }
});
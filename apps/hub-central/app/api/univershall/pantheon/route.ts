// app/api/univershall/pantheon/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallPantheonOrchestrator } from '@ilot/shared-core';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { unstable_cache } from 'next/cache';

// Gestion sécurisée du cache avec contournement en mode test (Vitest)
const getCachedPantheon = (yearMonth?: string) => {
  const fetcher = async () => {
    return await UniversHallPantheonOrchestrator.calculatePantheon(yearMonth);
  };

  if (process.env.NODE_ENV === 'test') {
    return fetcher();
  }

  return unstable_cache(
    fetcher,
    [`univershall-pantheon-${yearMonth || 'global'}`],
    { revalidate: 60, tags: ['univershall-pantheon', 'pantheon'] }
  )();
};

// -------------------------------------------------------------------------
// GET : Exposer le classement d'élite du Panthéon des Résonances (Public / Silice)
// -------------------------------------------------------------------------
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const yearMonth = url.searchParams.get('yearMonth') || undefined;

    const elite = await getCachedPantheon(yearMonth);

    return NextResponse.json({
      success: true,
      cycle: yearMonth || 'global',
      pantheon: elite
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL PANTHEON ERROR] :", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur interne lors du calcul du Panthéon des Résonances." 
    }, { status: 500 });
  }
});
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallPantheonOrchestrator } from '@ilot/shared-core';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { unstable_cache } from 'next/cache';

// Gestion sécurisée et propre du cache de production (totalement agnostique du contexte Vitest)
const getCachedPantheon = (yearMonth?: string) => {
  const fetcher = async () => {
    return await UniversHallPantheonOrchestrator.calculatePantheon(yearMonth);
  };

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
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const yearMonth = url.searchParams.get('yearMonth') || undefined;

    const elite = await getCachedPantheon(yearMonth);

    return NextResponse.json({
      success: true,
      cycle: yearMonth || 'global',
      pantheon: elite
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL PANTHEON GET FATAL ERROR");
  }
});
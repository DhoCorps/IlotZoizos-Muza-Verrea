export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedAwards } from '@/lib/cache/canopy.cache';

// ==========================================
// GET : Récupérer les trophées de la Canopée (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const yearMonth = url.searchParams.get('yearMonth') || undefined;
    const awards = await getCachedAwards(yearMonth);
    
    return NextResponse.json({ success: true, awards }, { status: 200 });
  } catch (error: unknown) {
    // 🛡️ Utilisation du gestionnaire d'erreur global (zéro 'any')
    return handleRouteError(error, "Erreur interne lors de la récupération des trophées.");
  }
});
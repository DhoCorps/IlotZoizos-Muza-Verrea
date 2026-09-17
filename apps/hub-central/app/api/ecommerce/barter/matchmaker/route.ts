export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedMatchmakerResults } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Matchmaker Harmonique (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const matches = await getCachedMatchmakerResults(userUid);
    return NextResponse.json({ success: true, matches }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du Matchmaker.");
  }
});
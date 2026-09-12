// Fichier : app/api/barter/matchmaker/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedMatchmakerResults } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Matchmaker Harmonique (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const matches = await getCachedMatchmakerResults(userUid);
    return NextResponse.json({ success: true, matches }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur du Matchmaker Harmonique :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du Matchmaker." }, { status: 500 });
  }
});
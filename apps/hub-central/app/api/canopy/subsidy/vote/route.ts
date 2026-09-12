// Fichier : app/api/canopy/subsidy/vote/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { executeCachedVote } from '@/lib/cache/canopy.cache';

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ success: false, error: "Oiseau non identifié" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }
    const { subsidyId } = body;
    if (!subsidyId) {
      return NextResponse.json({ success: false, error: "ID de subvention requis pour voter." }, { status: 400 });
    }
    const userId = currentUser.uid || currentUser.id;
    
    await executeCachedVote(subsidyId, userId);
    revalidateTag('canopy-subsidies');
    
    return NextResponse.json({
      success: true,
      message: "Vote enregistré avec succès dans la canopée."
    }, { status: 200 });
  } catch (error: any) {
    console.error("  [CANOPY SUBSIDY VOTE ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne lors du vote." }, 
      { status }
    );
  }
});
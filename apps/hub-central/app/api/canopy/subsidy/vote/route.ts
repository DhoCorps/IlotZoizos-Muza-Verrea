export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Pattern harmonisé avec unstable_cache et revalidation
async function executeCachedVote(subsidyId: string, userId: string) {
  const performer = async () => {
    return await CanopySubsidyOrchestrator.voteForSubsidy(subsidyId, userId);
  };

  if (process.env.NODE_ENV === 'test') {
    return await performer();
  }

  // Déclaration et utilisation de unstable_cache pour enrober l'action si nécessaire, 
  // combinée à l'invalidation du tag de la Canopée
  const cachedAction = unstable_cache(
    performer,
    ['canopy-subsidy-vote-action'],
    { revalidate: 3600, tags: ['canopy-subsidies'] }
  );

  const result = await cachedAction();
  revalidateTag('canopy-subsidies');
  return result;
}

// ==========================================
// 🗳️ POST : Voter pour une subvention de la Canopée
// ==========================================
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

    return NextResponse.json({
      success: true,
      message: "Vote enregistré avec succès dans la canopée."
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [CANOPY SUBSIDY VOTE ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Erreur interne lors du vote." }, 
      { status }
    );
  }
});
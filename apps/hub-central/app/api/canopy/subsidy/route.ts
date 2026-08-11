export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SubsidyModel } from '@ilot/infrastructure';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass automatique en mode test pour les subventions
async function getCachedSubsidies() {
  const fetcher = async () => {
    return await SubsidyModel.find({}).sort({ voteCount: -1, createdAt: -1 }).lean().exec();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['canopy-subsidies-list'],
    { revalidate: 1800, tags: ['canopy-subsidies'] }
  )();
}

// ==========================================
// 🦅 GET : Récupérer toutes les demandes de subvention
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
  }

  try {
    const subsidies = await getCachedSubsidies();
    return NextResponse.json({ success: true, subsidies }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la récupération des subventions :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne." }, { status });
  }
});

// ==========================================
// 🦅 POST : Déposer une nouvelle demande de subvention
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { title, motivation, requestedAmount, currency, isRented } = body;

    if (!title || !motivation || !requestedAmount || !currency) {
      return NextResponse.json({ error: "Paramètres de subvention incomplets (titre, motivation, montant, devise requis)." }, { status: 400 });
    }

    const userId = currentUser.uid || currentUser.id;

    const newSubsidy = await SubsidyModel.create({
      requesterUid: userId,
      title,
      motivation,
      requestedAmount: Number(requestedAmount),
      currency,
      isRented: Boolean(isRented),
      status: 'PENDING'
    });

    // 💥 BOOM ! Invalidation chirurgicale du cache des subventions suite au dépôt
    revalidateTag('canopy-subsidies');

    return NextResponse.json({
      success: true,
      subsidy: newSubsidy
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du dépôt de la subvention :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne du guichet." }, { status });
  }
});
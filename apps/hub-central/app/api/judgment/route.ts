// app/api/judgment/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KarmaOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // Bouclier souverain strict

// ==========================================
// GET : Sélectionner des jurés impartiaux (Tribunal de la Canopée)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const plaintiffId = url.searchParams.get('plaintiffId');
    const defendantId = url.searchParams.get('defendantId');

    if (!plaintiffId || !defendantId) {
      return NextResponse.json(
        { error: "Les identifiants du plaignant et de l'accusé sont requis pour former le Tribunal." }, 
        { status: 400 }
      );
    }

    const orchestrator = new KarmaOrchestrator();
    const result = await orchestrator.summonImpartialJurors(plaintiffId, defendantId, 5);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [JUDGMENT JURORS GET ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur interne lors de la convocation du Tribunal." }, { status });
  }
});

// ==========================================
// POST : Exécuter la sentence (Frappe ou Bouclier Karmique)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { targetIdentifier, reportUid, judgmentLevel } = body;

    if (!targetIdentifier || !reportUid || judgmentLevel === undefined) {
      return NextResponse.json(
        { error: "Paramètres incomplets (cible, rapport, niveau de jugement requis)." }, 
        { status: 400 }
      );
    }

    // Le jugement exige une Aura absolue (*) ou des droits d'exil
    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const orchestrator = new KarmaOrchestrator();
    const result = await orchestrator.executeJudgmentSanction(
      targetIdentifier,
      reportUid,
      Number(judgmentLevel) as 1 | 2 | 3,
      signature
    );

    // 💥 Invalidation chirurgicale du cache
    revalidateTag('reports');
    revalidateTag(`report-${reportUid}`);
    revalidateTag('users');
    revalidateTag(`profile-${result.targetUid}`);

    return NextResponse.json({
      success: true,
      message: result.usedGrace
        ? "✨ Le Bouclier Karmique a absorbé le choc. Une Grâce dorée a été consumée."
        : "⚡ La sentence est tombée et a été gravée dans la Matrice.",
      data: result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 [JUDGMENT SANCTION POST ERROR] :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur interne lors du jugement." }, { status });
  }
});
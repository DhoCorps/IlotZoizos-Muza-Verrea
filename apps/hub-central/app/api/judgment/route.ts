export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KarmaOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de la sentence)
// ==========================================
const JudgmentPayloadSchema = z.object({
  targetIdentifier: z.string().min(1, "La cible est requise."),
  reportUid: z.string().min(1, "L'identifiant du rapport est requis."),
  judgmentLevel: z.number().int().min(1).max(3, "Le niveau de jugement doit être compris entre 1 et 3.")
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateJudgmentCascades(reportUid: string, targetUid?: string): void {
  revalidateTag('reports');
  revalidateTag(`report-${reportUid}`);
  revalidateTag('users');
  if (targetUid) {
    revalidateTag(`profile-${targetUid}`);
  }
}

// ==========================================
// GET : Sélectionner des jurés impartiaux (Tribunal de la Canopée)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const plaintiffId = url.searchParams.get('plaintiffId');
    const defendantId = url.searchParams.get('defendantId');

    if (!plaintiffId || !defendantId) {
      return NextResponse.json(
        { success: false, error: "Les identifiants du plaignant et de l'accusé sont requis pour former le Tribunal." }, 
        { status: 400 }
      );
    }

    const orchestrator = new KarmaOrchestrator();
    const result = await orchestrator.summonImpartialJurors(plaintiffId, defendantId, 5);

    return NextResponse.json({ ...result, success: true }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la convocation du Tribunal.");
  }
});

// ==========================================
// POST : Exécuter la sentence (Frappe ou Bouclier Karmique)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod
    const validation = JudgmentPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Paramètres incomplets (cible, rapport, niveau de jugement requis).", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { targetIdentifier, reportUid, judgmentLevel } = validation.data;

    // Le jugement exige une signature d'acteur sécurisée
    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const orchestrator = new KarmaOrchestrator();
    const result = await orchestrator.executeJudgmentSanction(
      targetIdentifier,
      reportUid,
      judgmentLevel as 1 | 2 | 3,
      signature
    );

    // 💥 Invalidation chirurgicale du cache
    revalidateJudgmentCascades(reportUid, result.targetUid);

    return NextResponse.json({
      success: true,
      message: result.usedGrace
        ? "✨ Le Bouclier Karmique a absorbé le choc. Une Grâce dorée a été consumée."
        : "⚡ La sentence est tombée et a été gravée dans la Matrice.",
      data: result // <--- On encapsule proprement le résultat ici
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du jugement.");
  }
});
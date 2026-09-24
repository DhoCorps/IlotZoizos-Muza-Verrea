export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour la validation du Swipe / Match
const RegisterSwipeSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible est requis."),
  action: z.enum(['LIKE', 'PASS'], { message: "L'action doit être 'LIKE' ou 'PASS'." }),
});

type RegisterSwipeInput = z.infer<typeof RegisterSwipeSchema>;

// ==========================================
// POST : Enregistrer un Swipe / Affinité (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation de la structure via Zod
    const validation = RegisterSwipeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Paramètres de swipe incomplets ou invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: RegisterSwipeInput = validation.data;

    const swiperUid = currentUser.uid;
    if (!swiperUid) {
      return NextResponse.json({ error: "Oiseau non authentifié." }, { status: 401 });
    }

    // Appel de l'Orchestrator métier pour gérer la transaction Graph & Mongo
    const orchestrator = new KontaktOrchestrator();
    const swipeResult = await orchestrator.registerSwipe(
      {
        swiperUid,
        targetUid: sanitizedData.targetUid,
        action: sanitizedData.action,
      },
      {
        actorUid: swiperUid,
        capabilities: currentUser.capabilities || [],
      }
    );

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-swipes');
    revalidateTag(`matches-${swiperUid}`);
    revalidateTag(`matches-${sanitizedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "Swipe enregistré avec succès.",
      data: swipeResult,
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT SWIPES POST ERROR');
  }
});
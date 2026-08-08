export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 POST : Enregistrer un Swipe Kontakt (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const swiperUid = currentUser.uid;
    const { targetUid, action } = body; // action: 'LIKE' | 'PASS'

    if (!targetUid || !action) {
      return NextResponse.json({ error: "Paramètres de swipe incomplets." }, { status: 400 });
    }

    let result;
    try {
      const orchestrator = new KontaktOrchestrator();
      result = await orchestrator.registerSwipe(
        { swiperUid, targetUid, action },
        {
          actorUid: swiperUid,
          capabilities: currentUser.capabilities || []
        }
      );
    } catch (orchErr: any) {
      console.error("🔥 [KONTAKT ORCHESTRATOR SWIPE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 400;
      return NextResponse.json({ error: orchErr.message || "Échec de l'enregistrement du swipe." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade pour les flux et les matchs potentiels
    revalidateTag('kontakt-swipes');
    revalidateTag(`matches-${swiperUid}`);
    revalidateTag(`matches-${targetUid}`);

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'enregistrement du Swipe :", error);
    return NextResponse.json({ error: error.message || "Échec du swipe." }, { status: 500 });
  }
});
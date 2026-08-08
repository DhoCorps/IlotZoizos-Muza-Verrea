import { NextResponse } from 'next/server';
import { SovereignPurgeOrchestrator, PurgeContext } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

// ==========================================
// 💥 POST : Exécution de la Purge Souveraine
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Ordre de purge illisible." }, { status: 400 });
    }

    const { entityId, reason } = body;

    if (!entityId || !reason) {
      return NextResponse.json({ error: "Contexte de purge incomplet." }, { status: 400 });
    }

    const signature: ActionSignature = { 
      actorUid: currentUser.uid, 
      capabilities: currentUser.capabilities || [] 
    };
    const purgeContext: PurgeContext = { entityId, reason };

    let result;
    try {
      const orchestrator = new SovereignPurgeOrchestrator();
      result = await orchestrator.executeSovereignPurge(purgeContext, signature);
    } catch (orchErr: any) {
      console.error("🌋 [PURGE ORCHESTRATOR ERROR]", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json(
        { error: orchErr.message || "Erreur interne lors de la dissolution." }, 
        { status }
      );
    }

    // 💥 BOOM ! Invalidation chirurgicale et globale du cache suite à la désintégration
    revalidateTag('sujets');
    revalidateTag('tasks');
    revalidateTag('teams');
    revalidateTag(`entity-${entityId}`);

    return NextResponse.json({
      success: true,
      message: "L'évanescence a dissous toutes les traces de l'entité.",
      result
    }, { status: 200 });

  } catch (error: any) {
    console.error("🌋 Fracture globale lors de la purge souveraine :", error);
    return NextResponse.json({ error: "Erreur critique globale." }, { status: 500 });
  }
});
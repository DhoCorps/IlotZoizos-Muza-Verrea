import { NextResponse } from 'next/server';
import { ActionSignature } from '@ilot/types';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { SystemPurgeJobModel } from '@ilot/infrastructure';

export const dynamic = 'force-dynamic';

// ==========================================
// 💥 POST : Planification de la Purge Souveraine
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

    // 🛡️ Au lieu d'exécuter la purge, on l'inscrit dans le registre asynchrone (Background Job)
    await SystemPurgeJobModel.create({
      entityId,
      reason,
      actorUid: signature.actorUid,
      capabilities: signature.capabilities,
      status: 'PENDING'
    });

    console.log(`⏳ [Purge] Ordre d'évanescence planifié pour l'entité : ${entityId}`);

    // On répond immédiatement (202 Accepted) pour ne pas bloquer le Vercel/Serverless timeout
    return NextResponse.json({
      success: true,
      message: "L'ordre d'évanescence a été transmis aux abysses. La dissolution est en cours.",
    }, { status: 202 });

  } catch (error: any) {
    console.error("🌋 Fracture lors de la planification de la purge :", error);
    return NextResponse.json({ error: "Erreur critique globale." }, { status: 500 });
  }
});
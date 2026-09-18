export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { ActionSignature } from '@ilot/types';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { SystemPurgeJobModel } from '@ilot/infrastructure';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour l'ordre de purge souveraine
const SovereignPurgeSchema = z.object({
  entityId: z.string().min(1, "L'identifiant de l'entité est requis."),
  reason: z.string().min(1, "Le motif de la purge est requis."),
});

// ==========================================
// 💥 POST : Planification de la Purge Souveraine
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Ordre de purge illisible." }, { status: 400 });
    }

    const validation = SovereignPurgeSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Contexte de purge incomplet ou invalide.", details: validation.error.flatten() }, { status: 400 });
    }

    const { entityId, reason } = validation.data;

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

  } catch (error: unknown) {
    return handleRouteError(error, 'SOVEREIGN PURGE ERROR');
  }
});
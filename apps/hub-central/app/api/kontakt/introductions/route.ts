export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider la demande de passerelle (Mise en relation)
const RequestIntroductionPayloadSchema = z.object({
  intermediaryUid: z.string().min(1, "L'identifiant de l'intermédiaire est requis."),
  targetUid: z.string().min(1, "L'identifiant de la cible est requis."),
  message: z.string().min(1, "Le message d'accompagnement pour l'intermédiaire est requis."),
});

type RequestIntroductionInput = z.infer<typeof RequestIntroductionPayloadSchema>;

// ==========================================
// POST : Demander une Passerelle / Mise en relation (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validation = RequestIntroductionPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const sanitizedData: RequestIntroductionInput = validation.data;
    const actorUid = currentUser.uid;

    if (actorUid === sanitizedData.intermediaryUid || actorUid === sanitizedData.targetUid) {
      return NextResponse.json({ success: false, error: "Impossible d'utiliser sa propre entité comme intermédiaire ou cible de passerelle." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities: currentUser.capabilities || []
    };

    // 🌉 Délégation de l'action à l'Orchestrateur (Enregistre l'interaction et notifie l'intermédiaire)
    const orchestrator = new KontaktOrchestrator();
    let result;
    try {
      result = await orchestrator.requestIntroduction({
        requesterUid: actorUid,
        intermediaryUid: sanitizedData.intermediaryUid,
        targetUid: sanitizedData.targetUid,
        message: sanitizedData.message,
      }, signature);
    } catch (orchErr: unknown) {
      const errObj = orchErr as { status?: number; message?: string };
      const status = errObj.status || 400;
      return NextResponse.json({ success: false, error: errObj.message || "Échec de la demande de passerelle." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    revalidateTag(`introductions-${sanitizedData.intermediaryUid}`);
    revalidateTag(`user-introductions-${actorUid}`);

    return NextResponse.json({
      success: true,
      message: "Demande de passerelle tissée et transmise à l'intermédiaire avec succès.",
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la demande de passerelle.");
  }
});
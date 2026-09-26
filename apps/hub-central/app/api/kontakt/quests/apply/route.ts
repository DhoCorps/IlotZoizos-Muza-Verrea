export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { JobQuestModel } from '@ilot/infrastructure';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider la candidature à une quête (Mode Chercheur)
const QuestApplyPayloadSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la quête (targetUid) est requis."),
  coverMessage: z.string().optional().default(''),
});

type QuestApplyInput = z.infer<typeof QuestApplyPayloadSchema>;

// ==========================================
// POST : Postuler à une Quête / Enregistrer une candidature (Strictement Privé / Aura)
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
    const validation = QuestApplyPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const sanitizedData: QuestApplyInput = validation.data;
    const applicantUid = currentUser.uid;

    // Vérification de l'existence de la quête dans la Silice
    const targetQuest = await JobQuestModel.findOne({ uid: sanitizedData.targetUid }).lean();
    if (!targetQuest) {
      return NextResponse.json({ success: false, error: "Quête introuvable dans la matrice." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: applicantUid,
      capabilities: currentUser.capabilities || []
    };

    // 🕊️ Enregistrement de l'interaction de candidature via l'Orchestrateur ou transaction dédiée
    const orchestrator = new KontaktOrchestrator();
    
    // Si la quête comporte un système de swipe/postulation, on l'enregistre ou on déclenche une liaison de graphe
    let applyResult;
    try {
      applyResult = await orchestrator.registerSwipe({
        swiperUid: applicantUid,
        targetUid: sanitizedData.targetUid,
        action: 'LIKE',
      }, signature);
    } catch (orchErr: unknown) {
      const errObj = orchErr as { status?: number; message?: string };
      const status = errObj.status || 400;
      return NextResponse.json({ success: false, error: errObj.message || "Échec de la transmission de candidature." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('job-quests');
    revalidateTag('kontakt-quests');
    revalidateTag(`quest-applications-${sanitizedData.targetUid}`);
    revalidateTag(`user-applications-${applicantUid}`);

    return NextResponse.json({
      success: true,
      message: "Candidature transmise et enregistrée avec succès pour cette quête.",
      data: applyResult
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la postulation à la quête.");
  }
});
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
  coverMessage: z.string().max(2000, "Le message de motivation est trop long.").optional().default(''),
});

type QuestApplyInput = z.infer<typeof QuestApplyPayloadSchema>;

interface IJobQuestLean {
  uid: string;
  title: string;
  status?: string;
  settings?: {
    allowApplications?: boolean;
  };
  [key: string]: unknown;
}

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

    // 1. Vérification de l'existence de la quête dans la Silice
    const targetQuest = (await JobQuestModel.findOne({ uid: sanitizedData.targetUid }).lean()) as unknown as IJobQuestLean | null;
    if (!targetQuest) {
      return NextResponse.json({ success: false, error: "Quête introuvable dans la matrice." }, { status: 404 });
    }

    // 2. Vérification de l'ouverture des candidatures (Gouvernance JobQuest SSOT)
    if (
      targetQuest.settings?.allowApplications === false ||
      (targetQuest.status && targetQuest.status !== 'ACTIVE')
    ) {
      return NextResponse.json(
        { success: false, error: "Les candidatures pour cette quête sont actuellement fermées." },
        { status: 403 }
      );
    }

    const questCanonicalUid = targetQuest.uid || sanitizedData.targetUid;

    const signature: ActionSignature = {
      actorUid: applicantUid,
      capabilities: currentUser.capabilities || []
    };

    // 3. 🕊️ Enregistrement de la candidature via la méthode dédiée de l'Orchestrateur
    const orchestrator = new KontaktOrchestrator();
    
    let applyResult;
    try {
      applyResult = await orchestrator.applyToQuest({
        applicantUid,
        questUid: questCanonicalUid,
        questTitle: targetQuest.title,
        coverMessage: sanitizedData.coverMessage,
      }, signature);
    } catch (orchErr: unknown) {
      const errObj = orchErr as { status?: number; message?: string };
      const status = errObj.status || 400;
      return NextResponse.json({ success: false, error: errObj.message || "Échec de la transmission de candidature." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('job-quests');
    revalidateTag('kontakt-quests');
    revalidateTag(`quest-applications-${questCanonicalUid}`);
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
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider le dépôt d'un avis après collaboration
const LeaveReviewPayloadSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible évaluée est requis."),
  rating: z.number().int().min(1).max(5, "La note (rating) doit être comprise entre 1 et 5."),
  comment: z.string().min(1, "Le commentaire d'évaluation est requis."),
});

type LeaveReviewInput = z.infer<typeof LeaveReviewPayloadSchema>;

// ==========================================
// POST : Laisser un Avis / Review après collaboration (Strictement Privé / Aura)
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
    const validation = LeaveReviewPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const sanitizedData: LeaveReviewInput = validation.data;
    const actorUid = currentUser.uid;

    if (actorUid === sanitizedData.targetUid) {
      return NextResponse.json({ success: false, error: "On ne peut pas s'auto-évaluer." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities: currentUser.capabilities || []
    };

    // ⭐ Délégation de l'action à l'Orchestrateur (Vérifie la relation :HIRED dans Neo4j)
    const orchestrator = new KontaktOrchestrator();
    let result;
    try {
      result = await orchestrator.leaveReview(sanitizedData, signature);
    } catch (orchErr: unknown) {
      const errObj = orchErr as { status?: number; message?: string };
      const status = errObj.status || 400;
      return NextResponse.json({ success: false, error: errObj.message || "Impossible de consigner l'avis." }, { status });
    }

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${sanitizedData.targetUid}`);
    revalidateTag(`reviews-${sanitizedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "Avis consigné avec succès dans la matrice.",
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du dépôt de l'avis.");
  }
});
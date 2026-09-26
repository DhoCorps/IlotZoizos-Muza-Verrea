export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider la recommandation directe ("Vouches for")
const RegisterEndorsementPayloadSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible est requis."),
  skill: z.string().min(1, "La compétence ou le domaine de recommandation est requis."),
  comment: z.string().optional().default(''),
});

type RegisterEndorsementInput = z.infer<typeof RegisterEndorsementPayloadSchema>;

// ==========================================
// POST : Enregistrer une Recommandation / "Vouches for" (Strictement Privé / Aura)
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
    const validation = RegisterEndorsementPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const sanitizedData: RegisterEndorsementInput = validation.data;
    const actorUid = currentUser.uid;

    if (actorUid === sanitizedData.targetUid) {
      return NextResponse.json({ success: false, error: "On ne peut pas s'auto-recommander." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid,
      capabilities: currentUser.capabilities || []
    };

    // 🤝 Délégation de l'action à l'Orchestrateur
    const orchestrator = new KontaktOrchestrator();
    const result = await orchestrator.registerEndorsement(sanitizedData, signature);

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    revalidateTag(`kontakt-profile-${sanitizedData.targetUid}`);
    revalidateTag(`endorsements-${sanitizedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "Recommandation enregistrée avec succès.",
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de l'enregistrement de la recommandation.");
  }
});
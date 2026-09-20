export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { PropagationOrchestrator } from '@ilot/shared-core';
import { ActionSignature, PropagationScope } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD (Validation stricte & Anti Mass Assignment)
// ==========================================
const PropagatePayloadSchema = z.object({
  artifactUid: z.string().uuid("L'UID de l'œuvre doit être un UUID valide."),
  artifactType: z.enum([
    'BLOG', 'PROJECT', 'FONT', 'SPRITE', 'PROFILE', 'GAME', 'LYRIKA', 'SAMPLOTEK', 'BIBLIOTEK', 'POETRIK'
  ], { message: "Type d'artefact non reconnu." }),
  scope: z.enum(['TARGETED', 'GLOBAL'], { message: "La portée doit être TARGETED ou GLOBAL." }),
  receiverUids: z.array(z.string().uuid("L'UID du destinataire doit être valide.")).optional().default([]),
  customMessage: z.string().max(500, "Le message est trop long.").optional()
}).refine(data => {
  // Application stricte de la Règle d'Or du Kosmos
  if (data.scope === 'TARGETED' && data.receiverUids.length === 0) return false;
  if (data.scope === 'GLOBAL' && data.receiverUids.length > 0) return false;
  return true;
}, {
  message: "Incohérence : Un partage ciblé exige des destinataires, un partage global n'en accepte aucun.",
  path: ["receiverUids"]
});

// ==========================================
// FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidatePropagationCascades(artifactUid: string, userUid: string): void {
  revalidateTag('propagation');
  revalidateTag(`propagation-artifact-${artifactUid}`);
  revalidateTag(`propagation-user-${userUid}`);
  // Invalidation de l'œuvre originelle pour rafraîchir instantanément ses compteurs de viralité
  revalidateTag(`entity-${artifactUid}`); 
}

// ==========================================
// POST : Propager un Artefact (Le Partage Organique)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Le chant est illisible : Corps de requête manquant ou malformé." }, { status: 400 });
    }

    // 1. Blindage strict via Zod
    const validation = PropagatePayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Paramètres de propagation invalides.",
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const validatedData = validation.data;

    // 2. Forge de la signature d'action
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 3. Exécution via l'Orchestrateur (Tissage Neo4j + Sédimentation Mongo)
    let result;
    try {
      const orchestrator = new PropagationOrchestrator();
      result = await orchestrator.propagateArtifact({
        artifactUid: validatedData.artifactUid,
        artifactType: validatedData.artifactType as any,
        scope: validatedData.scope as PropagationScope,
        receiverUids: validatedData.receiverUids,
        customMessage: validatedData.customMessage
      }, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌊 [PROPAGATION ROUTE ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ 
        success: false, 
        error: err.message || "L'Îlot n'a pas pu propager cet écho." 
      }, { status });
    }

    // 4. BOOM ! Invalidation chirurgicale du cache en cascade
    revalidatePropagationCascades(validatedData.artifactUid, currentUser.uid);

    // 5. Réponse du Kosmos
    return NextResponse.json({
      success: true,
      message: validatedData.scope === 'GLOBAL' 
        ? "L'œuvre a été diffusée à l'ensemble du réseau." 
        : "L'œuvre a été transmise à vos contacts ciblés.",
      data: result.mongo
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "PROPAGATION POST FATAL ERROR");
  }
});
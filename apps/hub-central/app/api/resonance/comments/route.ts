export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversalCommentOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD (Validation stricte & Anti Mass Assignment)
// ==========================================
const FosterCommentSchema = z.object({
  targetUid: z.string().min(1, "L'UID de la cible est requis."),
  targetType: z.enum([
    'SUJET', 'PARTITA', 'SAMPLE', 'COMMENT', 'KONTRAKT', 'PROJECT',
    'BLOG', 'FONT', 'SPRITE', 'PROFILE', 'GAME', 'LYRIKA',
    'SAMPLOTEK', 'BIBLIOTEK', 'POETRIK'
  ], { message: "Type de cible non reconnu par la Silice." }),
  content: z.string()
    .min(1, "Un écho ne peut être vide.")
    .max(3000, "Le Kosmos limite les discours à 3000 caractères."),
  parentId: z.string().optional()
}).passthrough();

// ==========================================
// FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateCommentCascades(targetUid: string): void {
  revalidateTag('comments');
  revalidateTag(`comments-${targetUid}`);
  revalidateTag(`entity-${targetUid}`);
}

// ==========================================
// POST : Émettre une Résonance (Commentaire Universel)
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
    const validation = FosterCommentSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Paramètres de résonance invalides.",
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const validatedData = validation.data;

    // 2. Forge de la signature d'action
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 3. Exécution via l'Orchestrateur (Neo4j Reaction Check + Mongo + Gacha)
    let result;
    try {
      const orchestrator = new UniversalCommentOrchestrator();
      result = await orchestrator.fosterComment({
        targetUid: validatedData.targetUid,
        targetType: validatedData.targetType as any,
        content: validatedData.content,
        parentId: validatedData.parentId
      }, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🕊️ [UNIVERSAL COMMENT ROUTE ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ 
        success: false, 
        error: err.message || "L'Îlot repousse cet écho." 
      }, { status });
    }

    // 4. BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateCommentCascades(validatedData.targetUid);

    // 5. Réponse du Kosmos
    return NextResponse.json({
      success: true,
      message: result.isJackpot
        ? "🌟 BINGO ! Faveur du Kosmos accordée ! Votre résonance s'inscrit dans les étoiles."
        : "L'écho s'est propagé avec succès.",
      data: result.mongo,
      isJackpot: result.isJackpot
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSAL COMMENT POST FATAL ERROR");
  }
});
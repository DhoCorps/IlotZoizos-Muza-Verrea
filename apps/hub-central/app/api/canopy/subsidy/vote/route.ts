export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { executeCachedVote } from '@/lib/cache/canopy.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour le vote de subvention
const VoteSubsidySchema = z.object({
  subsidyId: z.string().min(1, "ID de subvention requis pour voter."),
});

// ==========================================
// POST : Enregistrer un vote pour une subvention (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = VoteSubsidySchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: "ID de subvention requis pour voter." }, { status: 400 });
    }

    const { subsidyId } = validationResult.data;
    
    try {
      // 🌿 Délégation totale au système de cache et à l'Orchestrateur (Double écriture Mongo + Neo4j)
      await executeCachedVote(subsidyId, currentUser.uid);
    } catch (orchErr: unknown) {
      console.error("🔥 [CANOPY VOTE POST ERROR] :", orchErr);
      const errObj = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = orchErr instanceof IlotError ? orchErr.status : (errObj.statusCode || 500);
      const message = orchErr instanceof IlotError ? orchErr.message : (errObj.message || "La matrice a rejeté ce vote.");
      return NextResponse.json({ success: false, error: message }, { status });
    }

    revalidateTag('canopy-subsidies');
    
    return NextResponse.json({
      success: true,
      message: "Vote enregistré avec succès dans la canopée et le graphe."
    }, { status: 200 });

  } catch (error: unknown) {
    // 🛡️ Gestionnaire d'erreur global unifié
    return handleRouteError(error, "Erreur interne lors du vote dans la canopée.");
  }
});
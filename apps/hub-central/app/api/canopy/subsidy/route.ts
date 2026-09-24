export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSubsidies } from '@/lib/cache/canopy.cache';
import { CanopySubsidyOrchestrator, IlotError } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod strict pour le dépôt de subvention (Harmonisé en centimes entiers)
const CreateSubsidySchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  motivation: z.string().min(1, "La motivation est requise."),
  requestedAmount: z.number().int("Le montant en centimes doit être un nombre entier.").positive("Le montant demandé doit être positif."),
  currency: z.string().min(1, "La devise est requise."),
  isRented: z.boolean().optional().default(false),
});

// ==========================================
// GET : Récupérer les subventions de la Canopée (Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const subsidies = await getCachedSubsidies();
    return NextResponse.json({ success: true, subsidies }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la récupération des subventions de la canopée.");
  }
});

// ==========================================
// POST : Déposer une nouvelle subvention (Strictement Privé / Aura)
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
    const validationResult = CreateSubsidySchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Paramètres de subvention invalides : ${errorMessage}` }, { status: 400 });
    }

    const payload = validationResult.data;
    
    // 🛡️ Signature d'action obligatoire pour l'Orchestrateur
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let newSubsidy;
    try {
      // 🌿 Délégation totale à l'Orchestrateur (Gère la double écriture Mongo + Neo4j)
      const orchestrator = new CanopySubsidyOrchestrator();
      newSubsidy = await orchestrator.fosterSubsidy(payload, signature);
    } catch (orchErr: unknown) {
      console.error("🔥 [CANOPY SUBSIDY POST ERROR] :", orchErr);
      const errObj = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = orchErr instanceof IlotError ? orchErr.status : (errObj.statusCode || 500);
      const message = orchErr instanceof IlotError ? orchErr.message : (errObj.message || "La matrice a rejeté cette demande de subvention.");
      return NextResponse.json({ success: false, error: message }, { status });
    }
    
    revalidateTag('canopy-subsidies');
    return NextResponse.json({
      success: true,
      subsidy: newSubsidy
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du guichet des subventions.");
  }
});
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { IlotError } from '@ilot/shared-core';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// SCHÉMA ZOD : Validation du payload de résolution
// ==========================================
const ResolveAbandonedSchema = z.object({
  sessionUid: z.string().min(1, "L'identifiant de session (sessionUid) est requis."),
});

// ==========================================
// POST : Point d'entrée sécurisé pour le Cron Job (Résolution des abandons)
// ==========================================
export const POST = async (req: NextRequest) => {
  try {
    // 🛡️ Sécurisation de l'endpoint interne pour les Cron Jobs (Vérification d'un secret partagé)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_CRON_SECRET || process.env.CRON_SECRET;
    
    if (expectedSecret && internalSecret !== expectedSecret) {
      return NextResponse.json({ 
        success: false, 
        error: "Accès non autorisé : Secret interne invalide ou manquant." 
      }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // Validation stricte du contrat Zod
    const validation = ResolveAbandonedSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const { sessionUid } = validation.data;
    const orchestrator = new EcommerceOrchestrator();
    
    // Appel de la méthode de l'orchestrateur pour purger/abandonner la session et redistribuer la part au vendeur
    const result = await orchestrator.resolveAbandonedRoulette(sessionUid);

    return NextResponse.json({
      success: true,
      message: "Session de roulette abandonnée résolue avec succès dans la matrice.",
      data: result
    }, { status: 200 });

  } catch (error: unknown) {
    // Gestion des erreurs spécifiques de l'orchestrateur (ex: 400 si déjà traitée, 403 si non expirée)
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors de la résolution de la roulette abandonnée.");
  }
};
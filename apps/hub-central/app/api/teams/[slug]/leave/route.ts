import { NextResponse } from 'next/server';
import { TeamOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// ==========================================
// 🚀 POST : L'envol volontaire d'un oiseau hors du Nid parent
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Décodage du protocole mémoriel (corps JSON)
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const { mode } = body;

    if (!mode || !['CLEAN', 'TRACE'].includes(mode)) {
      return NextResponse.json({ 
        error: "Veuillez choisir un protocole mémoriel valide ('CLEAN' ou 'TRACE')." 
      }, { status: 400 });
    }

    // 3. Forge de la Signature d'Action à partir de l'Aura courante
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 4. Exécution du détachement via l'orchestrateur
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.leaveTeam(teamIdentifier, currentUser.uid, mode, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR LEAVE ERROR]", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Erreur interne lors de la séparation." }, { status });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache (Nids généraux, ce Nid spécifique et le profil de l'oiseau)
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    revalidateTag(`teams-${currentUser.uid}`);
    revalidateTag(`profile-${currentUser.uid}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'envol volontaire API (POST Leave Team):", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne lors de la séparation." }, 
      { status: error.statusCode || 500 }
    );
  }
});
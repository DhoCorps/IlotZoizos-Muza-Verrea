import { NextResponse } from 'next/server';
import { TeamOrchestrator } from "@ilot/shared-core";
import { ActionSignature } from "@ilot/types";
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// ==========================================
// 🚀 POST : Gestion des membres et recrutement au sein du Nid
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Décodage sécurisé du corps de requête (JSON)
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const { userUid, action, capabilities } = body;

    if (!action || action !== 'INVITE') {
      return NextResponse.json({ error: "Mouvement inconnu sur cette frontière." }, { status: 400 });
    }

    if (!userUid) {
      return NextResponse.json({ error: "L'UID de l'oiseau cible est manquant." }, { status: 400 });
    }

    // 3. Fabrication de la preuve d'Aura (Signature)
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 4. Exécution du recrutement via l'orchestrateur
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.inviteBird({
        teamUid: teamIdentifier,
        targetUserUid: userUid, 
        capabilities: capabilities || []
      }, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR INVITE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec du rituel d'invitation." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache (Nid et équipes des utilisateurs concernés)
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    revalidateTag(`teams-${userUid}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors du recrutement API (POST Members):", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { error: error.message || "Erreur interne lors du recrutement." }, 
      { status }
    );
  }
});
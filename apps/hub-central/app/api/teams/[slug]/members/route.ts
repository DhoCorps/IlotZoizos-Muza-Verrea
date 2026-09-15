import { NextResponse } from 'next/server';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from "@ilot/shared-core";
import { ActionSignature } from "@ilot/types";
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

// ==========================================
// 🚀 POST : Gestion des membres et recrutement au sein du Nid
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Décodage sécurisé et validation immédiate du corps de requête (avant toute IO)
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

    // 2. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 3. Résolution unifiée du Nid par slug ou UID via notre helper centralisé
    const team: any = await findEntityBySlugOrUid(TeamModel, teamIdentifier);
    if (!team) {
      return NextResponse.json({ error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    // 4. Fabrication de la preuve d'Aura (Signature)
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 5. Exécution du recrutement via l'orchestrateur en ciblant l'UID officiel du Nid
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.inviteBird({
        teamUid: team.uid, 
        targetUserUid: userUid, 
        capabilities: capabilities || []
      }, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR INVITE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec du rituel d'invitation." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (team.slug) revalidateTag(`team-${team.slug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);
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
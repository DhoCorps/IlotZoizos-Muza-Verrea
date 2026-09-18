export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour l'envol d'un oiseau hors du Nid
const LeaveTeamSchema = z.object({
  mode: z.enum(['CLEAN', 'TRACE'], { message: "Veuillez choisir un protocole mémoriel valide ('CLEAN' ou 'TRACE')." }),
});

// ==========================================
// 🚀 POST : L'envol volontaire d'un oiseau hors du Nid parent
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée du Nid par slug ou UID via notre helper centralisé
    const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!team) {
      return NextResponse.json({ success: false, error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    // 3. Décodage et validation par Zod du protocole mémoriel (corps JSON)
    let rawBody: unknown;
    try {
        rawBody = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const validation = LeaveTeamSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Veuillez choisir un protocole mémoriel valide ('CLEAN' ou 'TRACE').",
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { mode } = validation.data;

    // 4. Forge de la Signature d'Action à partir de l'Aura courante
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    // 5. Exécution du détachement via l'orchestrateur en ciblant l'UID officiel du Nid
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.leaveTeam(team.uid || teamIdentifier, currentUser.uid, mode, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TEAM ORCHESTRATOR LEAVE ERROR]", err);
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ success: false, error: err.message || "Erreur interne lors de la séparation." }, { status });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (team.slug) revalidateTag(`team-${team.slug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);
    revalidateTag(`teams-${currentUser.uid}`);
    revalidateTag(`profile-${currentUser.uid}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM LEAVE FATAL ERROR");
  }
});
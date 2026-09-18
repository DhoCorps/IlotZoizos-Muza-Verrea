export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TeamModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from "@ilot/shared-core";
import { ActionSignature } from "@ilot/types";
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour le recrutement / gestion des membres d'un Nid
const TeamMemberSchema = z.object({
  action: z.literal('INVITE', { message: "Mouvement inconnu sur cette frontière." }),
  userUid: z.string({ message: "L'UID de l'oiseau cible est manquant." }).min(1, "L'UID de l'oiseau cible est manquant."),
  capabilities: z.array(z.string()).optional(),
});

// ==========================================
// 🚀 POST : Gestion des membres et recrutement au sein du Nid
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Décodage sécurisé et validation immédiate par Zod du corps de requête (avant toute IO)
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const validation = TeamMemberSchema.safeParse(rawBody);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message;
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      
      // On retourne les messages exacts attendus par les tests selon la nature de l'erreur
      if (!rawBody || typeof rawBody !== 'object' || !(rawBody as Record<string, unknown>).action || (rawBody as Record<string, unknown>).action !== 'INVITE') {
        return NextResponse.json({ success: false, error: "Mouvement inconnu sur cette frontière." }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: errorMessage || "Données invalides.", details: validation.error.flatten() }, { status: 400 });
    }

    const { userUid, capabilities } = validation.data;

    // 2. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const teamIdentifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!teamIdentifier) {
      return NextResponse.json({ success: false, error: "Identifiant de nid (slug) invalide." }, { status: 400 });
    }

    // 🔍 3. Résolution unifiée du Nid par slug ou UID via notre helper centralisé
    const team = (await findEntityBySlugOrUid(TeamModel, teamIdentifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!team) {
      return NextResponse.json({ success: false, error: "Nid introuvable dans la Silice." }, { status: 404 });
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
        teamUid: team.uid || teamIdentifier, 
        targetUserUid: userUid, 
        capabilities: capabilities || []
      }, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("🌋 [TEAM ORCHESTRATOR INVITE ERROR]", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "Échec du rituel d'invitation." }, { status });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('teams');
    revalidateTag(`team-${teamIdentifier}`);
    if (team.slug) revalidateTag(`team-${team.slug}`);
    if (team.uid) revalidateTag(`team-${team.uid}`);
    revalidateTag(`teams-${userUid}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAM MEMBERS POST FATAL ERROR");
  }
});
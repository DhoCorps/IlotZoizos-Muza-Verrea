export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TeamOrchestrator } from "@ilot/shared-core";
import { TeamSchema, CAPABILITIES, ActionSignature } from "@ilot/types";
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedUserTeams } from '@/lib/cache/teams.cache';

// 🛡️ Fonction centralisée d'invalidation en cascade pour les listes et Nids
function revalidateTeamListCascades(userUid?: string, teamUid?: string) {
  revalidateTag('teams');
  revalidateTag('users');
  if (userUid) {
    revalidateTag(`teams-${userUid}`);
    revalidateTag(`user-teams-${userUid}`);
  }
  if (teamUid) {
    revalidateTag(`team-${teamUid}`);
  }
}

// ==========================================
// 🔍 GET : Recensement des Nids de l'Oiseau
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userTeams = await getCachedUserTeams(currentUser.uid);
    return NextResponse.json(userTeams, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "TEAMS GET FATAL ERROR");
  }
});

// ==========================================
// 📤 POST : Fonder une nouvelle escouade (Nid)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const hasPermission = currentUser.capabilities?.includes(CAPABILITIES.TEAM.CREATE) || currentUser.capabilities?.includes('*');

    if (!hasPermission) {
        console.warn(`🚫 [Auth] Tentative de fondation sans droits par : ${currentUser.uid}`);
        return NextResponse.json({ 
          success: false,
          error: "Aura insuffisante pour fonder un Nid.",
          debug_plumes: currentUser.capabilities 
        }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const creationSchema = TeamSchema.omit({ uid: true, ownerUid: true, leaderUid: true });
    const validated = creationSchema.safeParse(rawBody);

    if (!validated.success) {
      return NextResponse.json({ success: false, errors: validated.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };

    const teamEngine = new TeamOrchestrator();
    const result = (await teamEngine.fosterTeam({
      ...validated.data,
      ownerUid: currentUser.uid,
      leaderUid: currentUser.uid
    }, signature)) as { uid?: string; team?: { uid?: string }; [key: string]: unknown }; 

    // 💥 Invalidation globale et centralisée en cascade
    const createdTeamUid = result?.uid || result?.team?.uid;
    revalidateTeamListCascades(currentUser.uid, createdTeamUid);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "TEAMS POST FATAL ERROR");
  }
});
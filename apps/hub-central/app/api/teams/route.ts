import { NextResponse } from 'next/server';
import { TeamOrchestrator } from "@ilot/shared-core";
import { TeamSchema, CAPABILITIES, ActionSignature } from "@ilot/types";
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedUserTeams } from '@/lib/cache/teams.cache';

export const dynamic = 'force-dynamic';

// ==========================================
// 🔍 GET : Recensement des Nids de l'Oiseau
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userTeams = await getCachedUserTeams(currentUser.uid);
    return NextResponse.json(userTeams, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur globale lors de la récupération des Nids unifiés :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 📤 POST : Fonder une nouvelle escouade (Nid)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const hasPermission = currentUser.capabilities.includes(CAPABILITIES.TEAM.CREATE) || currentUser.capabilities.includes('*');

    if (!hasPermission) {
        console.warn(`🚫 [Auth] Tentative de fondation sans droits par : ${currentUser.uid}`);
        return NextResponse.json({ 
          error: "Aura insuffisante pour fonder un Nid.",
          debug_plumes: currentUser.capabilities 
        }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide ou manquant." }, { status: 400 });
    }

    const creationSchema = TeamSchema.omit({ uid: true, ownerUid: true, leaderUid: true });
    const validated = creationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities };

    const teamEngine = new TeamOrchestrator();
    const result = await teamEngine.fosterTeam({
      ...validated.data,
      ownerUid: currentUser.uid,
      leaderUid: currentUser.uid
    }, signature); 

    revalidateTag(`teams-${currentUser.uid}`);
    revalidateTag('teams');

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale de fondation :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur lors de la fondation." }, { status });
  }
});
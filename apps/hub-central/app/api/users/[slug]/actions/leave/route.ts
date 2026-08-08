import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core'; 
import { IOiseau, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier strict

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// 🧠 CACHE CHIRURGICAL : Récupération d'un profil spécifique
// -------------------------------------------------------------------------
const getCachedProfile = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      return await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as IOiseau | null;
    },
    [`user-profile-${targetSlug}`],
    { 
      revalidate: 60, 
      tags: ['users', 'profile', `profile-${targetSlug}`] 
    }
  )(); 
};

// ==========================================
// 🔍 GET : Lecture du Signal / Profil (Miroir)
// ==========================================
// 🛡️ withOptionalAura : Accessible à tous, mais identifie l'Oiseau connecté
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === targetSlug || (visitorUid ? slugify(visitorUid) === targetSlug : false);

    const oiseau = await getCachedProfile(targetSlug);

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée : Oiseau introuvable." }, { status: 404 });
    }

    const baseProfile = {
      uid: oiseau.uid,
      username: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities,
      signature: oiseau.sanctuaire?.signature || "Pas de signature"
    };

    if (isSelf) {
      return NextResponse.json({
        ...baseProfile,
        email: oiseau.email,
        entropieActive: oiseau.entropieActive,
        sanctuaire: oiseau.sanctuaire,
        sanctuaireVerrouille: oiseau.sanctuaireVerrouille,
        isGhostMode: oiseau.isGhostMode,
        characterSheet: oiseau.sanctuaire?.characterSheet || {}
      }, { status: 200 });
    }

    if (oiseau.sanctuaireVerrouille) {
      return NextResponse.json({
        username: oiseau.pseudo,
        frequenceHEX: '#000000',
        signature: "L'écho s'est éteint.",
        sanctuaire: oiseau.sanctuaire,
        avatarUrl: null,
        coverPicture: null
      }, { status: 200 });
    }

    if (oiseau.isGhostMode) {
      return NextResponse.json({
        username: oiseau.pseudo,
        frequenceHEX: oiseau.frequenceHEX,
        signature: "Cet esprit observe en silence.",
        avatarUrl: oiseau.avatarUrl,
        capabilities: oiseau.capabilities
      }, { status: 200 });
    }

    return NextResponse.json({
      ...baseProfile,
      sanctuaire: oiseau.sanctuaire,
      characterSheet: oiseau.sanctuaire?.characterSheet || {}
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
});

// ==========================================
// 📤 POST : L'Oiseau quitte le Nid (Leave)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    // 🛡️ VÉRIFICATIONS DE GOUVERNANCE
    if (currentUser.uid !== targetSlug && slugify(currentUser.uid) !== targetSlug) {
      return NextResponse.json({ error: "Souveraineté violée : vous ne pouvez forcer l'exil d'un autre." }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide" }, { status: 400 });
    }

    const { mode, teamId } = body;
    if (!teamId || !mode || (mode !== 'CLEAN' && mode !== 'TRACE')) {
      return NextResponse.json({ error: "Données incomplètes (attendu: CLEAN ou TRACE)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities
    };

    const orchestrator = new TeamOrchestrator();
    const result = await orchestrator.leaveTeam(teamId, currentUser.uid, mode, signature); 

    revalidateTag('teams');
    revalidateTag(`profile-${targetSlug}`);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'envol :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status });
  }
});
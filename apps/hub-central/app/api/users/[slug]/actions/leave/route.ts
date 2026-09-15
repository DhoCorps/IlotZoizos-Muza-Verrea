import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedOiseau } from '@/lib/cache/users.cache';

export const dynamic = 'force-dynamic';

// ==========================================
// GET : Lecture du Signal / Profil (Miroir)
// ==========================================
// withOptionalAura : Accessible à tous, mais identifie l'Oiseau connecté
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    if (!identifier) {
      return NextResponse.json({ message: "Identifiant invalide." }, { status: 400 });
    }

    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === identifier || (visitorUid ? slugify(visitorUid) === identifier : false);
    
    // Appel direct au service de cache centralisé, ou repli unifié
    let oiseau: any = await getCachedOiseau(identifier);
    if (!oiseau) {
      oiseau = await findEntityBySlugOrUid(OiseauModel, identifier);
    }
    
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
    console.error("  Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
});

// ==========================================
// POST : L'Oiseau quitte le Nid (Leave)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    // VÉRIFICATIONS DE GOUVERNANCE
    if (currentUser.uid !== identifier && slugify(currentUser.uid) !== identifier) {
      return NextResponse.json({ error: "Souveraineté violée : vous ne pouvez forcer l'exil d'un autre." }, { status: 403 });
    }
    
    // 🔍 Résolution unifiée pour s'assurer de l'existence de l'oiseau via le helper
    const targetOiseau: any = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!targetOiseau) {
      return NextResponse.json({ error: "Oiseau introuvable dans la Silice." }, { status: 404 });
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
    revalidateTag(`profile-${identifier}`);
    if (targetOiseau.uid) revalidateTag(`profile-${targetOiseau.uid}`);
    if (targetOiseau.slug) revalidateTag(`profile-${targetOiseau.slug}`);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("  Fracture globale lors de l'envol :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status });
  }
});
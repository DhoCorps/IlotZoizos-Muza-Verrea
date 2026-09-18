export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withOptionalAura, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedOiseau } from '@/lib/cache/users.cache';

// ==========================================
// GET : Lecture du Signal / Profil (Miroir)
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 1. Résolution unifiée de l'Oiseau en premier
    let oiseau = (await getCachedOiseau(identifier)) as { uid?: string; pseudo?: string; email?: string; frequenceHEX?: string; avatarUrl?: string | null; coverPicture?: string | null; capabilities?: string[]; sanctuaire?: { signature?: string; characterSheet?: Record<string, unknown>; [key: string]: unknown }; sanctuaireVerrouille?: boolean; isGhostMode?: boolean; [key: string]: unknown } | null;
    if (!oiseau) {
      oiseau = (await findEntityBySlugOrUid(OiseauModel, identifier)) as typeof oiseau;
    }
    
    if (!oiseau) {
      return NextResponse.json({ success: false, message: "L'onde s'est dissipée : Oiseau introuvable." }, { status: 404 });
    }

    // 🛡️ 2. Contrôle de souveraineté basé sur l'UID canonique résolu
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === oiseau.uid;
    
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
  } catch (error: unknown) {
    return handleRouteError(error, "USERS MIRROR GET FATAL ERROR");
  }
});

// ==========================================
// POST : L'Oiseau quitte le Nid (Leave)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
         
    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 1. Résolution unifiée pour s'assurer de l'existence de l'oiseau via le helper en premier
    let targetOiseau = (await getCachedOiseau(identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!targetOiseau) {
      targetOiseau = (await findEntityBySlugOrUid(OiseauModel, identifier)) as typeof targetOiseau;
    }
    if (!targetOiseau) {
      return NextResponse.json({ success: false, error: "Oiseau introuvable dans la Silice." }, { status: 404 });
    }

    // 🛡️ 2. Vérifications de gouvernance basées sur l'UID canonique résolu (ou Admin)
    const isSelf = currentUser.uid === targetOiseau.uid;
    const isAdmin = currentUser.capabilities?.includes('*');
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ success: false, error: "Souveraineté violée : vous ne pouvez forcer l'exil d'un autre." }, { status: 403 });
    }

    let body: { mode?: string; teamId?: string; [key: string]: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête invalide" }, { status: 400 });
    }
     
    const { mode, teamId } = body || {};
    if (!teamId || !mode || (mode !== 'CLEAN' && mode !== 'TRACE')) {
      return NextResponse.json({ success: false, error: "Données incomplètes (attendu: CLEAN ou TRACE)." }, { status: 400 });
    }
     
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
     
    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.leaveTeam(teamId, targetOiseau.uid || identifier, mode, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "Erreur interne" }, { status });
    }
     
    revalidateTag('teams');
    revalidateTag(`profile-${identifier}`);
    if (targetOiseau.uid) revalidateTag(`profile-${targetOiseau.uid}`);
    if (targetOiseau.slug) revalidateTag(`profile-${targetOiseau.slug}`);
     
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "USERS LEAVE POST FATAL ERROR");
  }
});
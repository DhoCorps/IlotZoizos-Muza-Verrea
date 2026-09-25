export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withOptionalAura, withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedOiseau } from '@/lib/cache/users.cache';

// Helper interne pour vérifier la souveraineté (Self ou Admin)
function assertSovereignty(visitorUid: string, visitorCaps: string[], targetUid: string, targetSlug?: string): boolean {
  const isSelf = visitorUid === targetUid || (targetSlug ? visitorUid === targetSlug || slugify(visitorUid) === targetSlug : false);
  const isAdmin = visitorCaps.includes('*');
  return isSelf || isAdmin;
}

// -------------------------------------------------------------------------
// GET : Lecture du Profil (Miroir)
// -------------------------------------------------------------------------
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée en premier (Cache ou Silice) avec le cvProfile
    let oiseau = (await getCachedOiseau(identifier)) as { 
      uid?: string; 
      slug?: string;
      pseudo?: string; 
      email?: string; 
      frequenceHEX?: string; 
      entropieActive?: number; 
      sanctuaire?: unknown; 
      sanctuaireVerrouille?: boolean; 
      isGhostMode?: boolean; 
      avatarUrl?: string | null; 
      coverPicture?: string | null; 
      capabilities?: string[]; 
      cvProfile?: {
        experiences?: Array<{ isVisibleInCv?: boolean; [key: string]: unknown }>;
        educations?: Array<{ isVisibleInCv?: boolean; [key: string]: unknown }>;
        [key: string]: unknown;
      };
      [key: string]: unknown 
    } | null;

    if (!oiseau) {
      oiseau = (await findEntityBySlugOrUid(OiseauModel, identifier)) as typeof oiseau;
    }

    if (!oiseau) {
      return NextResponse.json({ success: false, message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // 🛡️ 3. Vérification de la propriété basée sur l'UID canonique résolu
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === oiseau.uid;

    // --- LE MIROIR INTIME (Expose les données privées et le CV complet) ---
    if (isSelf) {
      return NextResponse.json({
        success: true,
        pseudo: oiseau.pseudo,
        email: oiseau.email,
        frequenceHEX: oiseau.frequenceHEX,
        entropieActive: oiseau.entropieActive,
        sanctuaire: oiseau.sanctuaire,
        sanctuaireVerrouille: oiseau.sanctuaireVerrouille,
        isGhostMode: oiseau.isGhostMode,
        avatarUrl: oiseau.avatarUrl,
        coverPicture: oiseau.coverPicture,
        capabilities: oiseau.capabilities,
        cvProfile: oiseau.cvProfile || null
      }, { status: 200 });
    }

    // --- MODE STANDARD (Vitrine publique avec filtrage des expériences masquées) ---
    const publicCvProfile = oiseau.cvProfile ? {
      ...oiseau.cvProfile,
      experiences: (oiseau.cvProfile.experiences || []).filter(exp => exp.isVisibleInCv !== false),
      educations: (oiseau.cvProfile.educations || []).filter(edu => edu.isVisibleInCv !== false),
    } : null;

    return NextResponse.json({
      success: true,
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      sanctuaire: oiseau.sanctuaire,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities,
      cvProfile: publicCvProfile
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "USER PROFILE GET FATAL ERROR");
  }
});

// -------------------------------------------------------------------------
// PATCH : Mise à jour souveraine de l'Oiseau et de son Profil CV (SSOT)
// -------------------------------------------------------------------------
export const PATCH = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, message: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, message: "Identifiant invalide." }, { status: 400 });
    }

    // Résolution de l'Oiseau cible pour obtenir son UID canonique
    const targetUser = (await findEntityBySlugOrUid(OiseauModel, identifier)) as { uid?: string; slug?: string; [key: string]: unknown } | null;
    if (!targetUser || !targetUser.uid) {
      return NextResponse.json({ success: false, message: "Oiseau introuvable dans la Silice." }, { status: 404 });
    }

    // Contrôle de Souveraineté strict
    if (!assertSovereignty(currentUser.uid, currentUser.capabilities || [], targetUser.uid, targetUser.slug as string)) {
      return NextResponse.json({ success: false, message: "Souveraineté violée : vous ne pouvez modifier un autre Oiseau." }, { status: 403 });
    }

    // Parsage du corps de la requête
    let body: { pseudo?: string; frequenceHEX?: string; cvProfile?: unknown; [key: string]: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Corps de requête invalide." }, { status: 400 });
    }

    // Appel à l'OiseauOrchestrator pour effectuer la double écriture (Mongo + Neo4j)
    const orchestrator = new OiseauOrchestrator();
    const signature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const syncResult = await orchestrator.syncOiseau({
      uid: targetUser.uid,
      pseudo: body.pseudo,
      frequenceHEX: body.frequenceHEX,
      cvProfile: body.cvProfile as any
    }, signature);

    // Invalidation chirurgicale du cache en cascade
    revalidateTag(`profile-${identifier}`);
    if (targetUser.slug) revalidateTag(`profile-${targetUser.slug}`);
    if (targetUser.uid) revalidateTag(`profile-${targetUser.uid}`);
    revalidateTag('users');

    return NextResponse.json({
      success: true,
      message: "L'essence de l'Oiseau et son profil CV ont été synchronisés !",
      mongo: syncResult.mongo
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "USER PROFILE PATCH FATAL ERROR");
  }
});
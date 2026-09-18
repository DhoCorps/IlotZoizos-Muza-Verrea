export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedOiseau } from '@/lib/cache/users.cache';

// -------------------------------------------------------------------------
// GET : Lecture du Profil (Miroir)
// -------------------------------------------------------------------------
// withOptionalAura : Laisse passer tout le monde, avec typage strict ApiContext
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

    // 🔍 2. Résolution unifiée en premier (Cache ou Silice) pour obtenir l'entité canonique
    let oiseau = (await getCachedOiseau(identifier)) as { uid?: string; pseudo?: string; email?: string; frequenceHEX?: string; entropieActive?: number; sanctuaire?: unknown; sanctuaireVerrouille?: boolean; isGhostMode?: boolean; avatarUrl?: string | null; coverPicture?: string | null; capabilities?: string[]; [key: string]: unknown } | null;
    if (!oiseau) {
      oiseau = (await findEntityBySlugOrUid(OiseauModel, identifier)) as typeof oiseau;
    }

    if (!oiseau) {
      return NextResponse.json({ success: false, message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // 🛡️ 3. Vérification de la propriété basée sur l'UID canonique résolu
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === oiseau.uid;

    // --- LE MIROIR INTIME (Expose les données privées) ---
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
        capabilities: oiseau.capabilities
      }, { status: 200 });
    }

    // --- MODE STANDARD (Vitrine publique) ---
    return NextResponse.json({
      success: true,
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      sanctuaire: oiseau.sanctuaire,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "USER PROFILE GET FATAL ERROR");
  }
});
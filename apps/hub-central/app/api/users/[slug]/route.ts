import { NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedOiseau } from '@/lib/cache/users.cache';

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// GET : Lecture du Profil (Miroir)
// -------------------------------------------------------------------------
// withOptionalAura : Laisse passer tout le monde, avec typage strict ApiContext
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ message: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée en premier (Cache ou Silice) pour obtenir l'entité canonique
    let oiseau: any = await getCachedOiseau(identifier);
    if (!oiseau) {
      oiseau = await findEntityBySlugOrUid(OiseauModel, identifier);
    }

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // 🛡️ 3. Vérification de la propriété basée sur l'UID canonique résolu
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === oiseau.uid;

    // --- LE MIROIR INTIME (Expose les données privées) ---
    if (isSelf) {
      return NextResponse.json({
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
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      sanctuaire: oiseau.sanctuaire,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities
    }, { status: 200 });
  } catch (error) {
    console.error("  Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
});
// Fichier : app/api/users/[slug]/route.ts
import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { IOiseau } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache } from 'next/cache';
import { withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Import strict de l'ApiContext

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// 🧠 CACHE CHIRURGICAL : Récupération d'un profil spécifique
// -------------------------------------------------------------------------
const getCachedOiseau = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      return await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as IOiseau | null;
    },
    [`user-profile-${targetSlug}`], // Identifiant unique pour CE profil
    { 
      revalidate: 60, 
      tags: ['users', 'profile', `profile-${targetSlug}`] 
    }
  )(); // ⚡ Exécution immédiate
};

// -------------------------------------------------------------------------
// 🔍 GET : Lecture du Profil (Miroir)
// -------------------------------------------------------------------------
// 🛡️ withOptionalAura : Laisse passer tout le monde, avec typage strict ApiContext
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Le visiteur est-il propriétaire du profil ?
    const visitorUid = currentUser?.uid;
    const isSelf = visitorUid === targetSlug || (visitorUid ? slugify(visitorUid) === targetSlug : false);

    // 3. Appel au cache (Soulage MongoDB)
    const oiseau = await getCachedOiseau(targetSlug);

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // --- 🛡️ LE MIROIR INTIME (Expose les données privées) ---
    if (isSelf) {
      return NextResponse.json({
        pseudo: oiseau.pseudo,
        email: oiseau.email, // 🪡 L'email n'est visible que pour soi-même
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

    // --- 🕊️ MODE STANDARD (Vitrine publique) ---
    return NextResponse.json({
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      sanctuaire: oiseau.sanctuaire,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
});
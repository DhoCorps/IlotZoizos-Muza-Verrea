export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { WishlistModel } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🗑️ DELETE : Dissoudre une liste ou retirer un artefact (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;

    const resolvedParams = await context.params;
    const rawSlug = (resolvedParams as any)?.slug;
    
    if (!rawSlug) {
      return NextResponse.json({ error: "Identifiant de slug invalide." }, { status: 400 });
    }
    
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 1. Tentative : Supprimer toute la wishlist si le slug correspond à une liste
    const deletedList = await WishlistModel.findOneAndDelete({ 
      uid: slug, 
      userUid: userUid 
    });

    if (deletedList) {
      // 💥 Invalidation du cache utilisateur
      revalidateTag(`user-wishlists-${userUid}`);
      revalidateTag('wishlists');
      return NextResponse.json({ success: true, message: "Wishlist dissoute avec succès." }, { status: 200 });
    }

    // 2. Sinon : Retirer le produit de toutes les wishlists de l'utilisateur
    const updated = await WishlistModel.updateMany(
      { userUid: userUid },
      { $pull: { productUids: slug } }
    );

    if (updated.modifiedCount === 0) {
      return NextResponse.json({ error: "Élément introuvable dans vos listes." }, { status: 404 });
    }

    // 💥 Invalidation du cache utilisateur
    revalidateTag(`user-wishlists-${userUid}`);
    revalidateTag('wishlists');

    return NextResponse.json({ success: true, message: "Artefact retiré de la liste de souhaits." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur fatale DELETE Wishlist :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});
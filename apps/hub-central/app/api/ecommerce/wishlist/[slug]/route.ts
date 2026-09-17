export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { WishlistModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IWishlist } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError, assertEntitySovereignty } from '@/lib/api-guards';

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateWishlistCascades(userUid: string): void {
  revalidateTag(`user-wishlists-${userUid}`);
  revalidateTag('wishlists');
  revalidateTag('ecommerce');
}

// ==========================================
// DELETE : Dissoudre une liste ou retirer un artefact (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;

    let resolvedParams: { slug?: string | string[] } | undefined;
    try {
      resolvedParams = await context.params;
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    if (!rawSlug) {
      return NextResponse.json({ success: false, error: "Identifiant de slug invalide." }, { status: 400 });
    }
         
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    // 🔍 Recherche unifiée par slug ou UID pour trouver la wishlist
    const targetList = await findEntityBySlugOrUid(WishlistModel, identifier) as IWishlist | null;
    
    // 1. Si la liste existe, on vérifie sa souveraineté et on la dissout
    if (targetList) {
      assertEntitySovereignty({ uid: currentUser.uid, capabilities: currentUser.capabilities }, targetList.userUid);

      await WishlistModel.deleteOne({ uid: targetList.uid });
      
      revalidateWishlistCascades(userUid);
      return NextResponse.json({ success: true, message: "Wishlist dissoute avec succès." }, { status: 200 });
    }
    
    // 2. Sinon, on suppose que l'identifiant cible un artefact/produit à retirer des listes
    const updated = await WishlistModel.updateMany(
      { userUid: userUid },
      { $pull: { productUids: identifier } }
    );

    if (updated.modifiedCount === 0) {
      return NextResponse.json({ success: false, error: "Élément introuvable dans vos listes." }, { status: 404 });
    }
    
    revalidateWishlistCascades(userUid);
    return NextResponse.json({ success: true, message: "Artefact retiré de la liste de souhaits." }, { status: 200 });
    
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la gestion de la wishlist.");
  }
});
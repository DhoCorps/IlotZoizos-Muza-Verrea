// Fichier : app/api/wishlist/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { WishlistModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedUserWishlists } from '@/lib/cache/ecommerce.cache';

// ==========================================
// GET : Récupérer ou initialiser les Wishlists (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid;
    const wishlists = await getCachedUserWishlists(userUid);
    return NextResponse.json({ success: true, data: wishlists }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur lors de la lecture des wishlists :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// POST : Créer une liste ou basculer un produit (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid;
    
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    const { productUid, wishlistUid, name } = body;
    
    if (name && !productUid) {
      const newWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: name.trim(),
        productUids: []
      });
      revalidateTag(`user-wishlists-${userUid}`);
      revalidateTag('wishlists');
      return NextResponse.json({ success: true, data: newWishlist }, { status: 201 });
    }
    
    const query = wishlistUid ? { uid: wishlistUid, userUid } : { userUid };
    let wishlist = await WishlistModel.findOne(query);
    if (!wishlist) {
      wishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: name || 'Favoris Principaux',
        productUids: productUid ? [productUid] : []
      });
    } else if (productUid) {
      if (!wishlist.productUids.includes(productUid)) {
        wishlist.productUids.push(productUid);
      } else {
        wishlist.productUids = wishlist.productUids.filter((id: string) => id !== productUid);
      }
      if (typeof wishlist.save === 'function') {
        await wishlist.save();
      }
    }
    
    revalidateTag(`user-wishlists-${userUid}`);
    revalidateTag('wishlists');
    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur lors de la mise à jour de la wishlist :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});
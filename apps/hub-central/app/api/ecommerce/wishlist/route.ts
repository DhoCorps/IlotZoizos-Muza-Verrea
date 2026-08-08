export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { WishlistModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération des wishlists de l'utilisateur (30s) avec bypass en mode test
async function getCachedUserWishlists(userUid: string) {
  const fetcher = async () => {
    let wishlists = await WishlistModel.find({ userUid }).lean();
    
    // Initialisation automatique d'une liste par défaut si vide
    if (!wishlists || wishlists.length === 0) {
      const defaultWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: 'Favoris Principaux',
        productUids: []
      });
      const obj = typeof defaultWishlist.toObject === 'function' ? defaultWishlist.toObject() : defaultWishlist;
      wishlists = [obj];
    }
    return wishlists;
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `wishlists-user-${userUid}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['wishlists', `user-wishlists-${userUid}`] }
  )();
}

// ==========================================
// 🔍 GET : Récupérer ou initialiser les Wishlists (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const wishlists = await getCachedUserWishlists(userUid);

    return NextResponse.json({ success: true, data: wishlists }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des wishlists :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Créer une liste ou basculer un produit (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { productUid, wishlistUid, name } = body;

    // 1. Création d'une nouvelle liste personnalisée si un nom est fourni sans produit initial
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

    // 2. Recherche ou initialisation de la wishlist cible
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

    // 💥 Invalidation chirurgicale du cache utilisateur
    revalidateTag(`user-wishlists-${userUid}`);
    revalidateTag('wishlists');

    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la mise à jour de la wishlist :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});
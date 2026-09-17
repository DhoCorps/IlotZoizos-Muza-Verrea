export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { WishlistModel } from '@ilot/infrastructure';
import { IWishlist } from '@ilot/types';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedUserWishlists } from '@/lib/cache/ecommerce.cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de la payload Wishlist)
// ==========================================
const WishlistPayloadSchema = z.object({
  productUid: z.string().optional(),
  wishlistUid: z.string().optional(),
  name: z.string().min(1, "Le nom de la liste ne peut être vide.").max(100).optional(),
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateWishlistCascades(userUid: string): void {
  revalidateTag(`user-wishlists-${userUid}`);
  revalidateTag('wishlists');
  revalidateTag('ecommerce');
}

// ==========================================
// GET : Récupérer ou initialiser les Wishlists (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    const wishlists = await getCachedUserWishlists(userUid);
    return NextResponse.json({ success: true, data: wishlists }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture des wishlists.");
  }
});

// ==========================================
// POST : Créer une liste ou basculer un produit (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid;
    
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod
    const validation = WishlistPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Contrat souverain invalide : Paramètres de wishlist incorrects.",
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { productUid, wishlistUid, name } = validation.data;
    
    if (name && !productUid && !wishlistUid) {
      const newWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: name.trim(),
        productUids: []
      }) as unknown as IWishlist;

      revalidateWishlistCascades(userUid);
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
      const currentProducts = (wishlist.productUids || []) as string[];
      if (!currentProducts.includes(productUid)) {
        wishlist.productUids = [...currentProducts, productUid];
      } else {
        wishlist.productUids = currentProducts.filter((id: string) => id !== productUid);
      }
      if (typeof (wishlist as unknown as { save?: Function }).save === 'function') {
        await (wishlist as unknown as { save: () => Promise<unknown> }).save();
      }
    }
    
    revalidateWishlistCascades(userUid);
    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la mise à jour de la wishlist.");
  }
});
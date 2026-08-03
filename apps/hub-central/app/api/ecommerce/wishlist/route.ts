// apps/hub-central/app/api/ecommerce/wishlist/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Ajusté selon la profondeur par rapport à app/api/ecommerce/wishlist
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    await connectToDatabase();
    const userUid = (session.user as any).uid || (session.user as any).id;
    
    // Récupérer toutes les wishlists de l'utilisateur
    let wishlists = await WishlistModel.find({ userUid }).lean();
    
    if (!wishlists || wishlists.length === 0) {
      const defaultWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: 'Favoris Principaux',
        productUids: []
      });
      // S'assurer que le résultat gère .toObject() ou l'objet brut
      const obj = typeof defaultWishlist.toObject === 'function' ? defaultWishlist.toObject() : defaultWishlist;
      wishlists = [obj];
    }

    return NextResponse.json({ success: true, data: wishlists }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des wishlists :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const userUid = (session.user as any).uid || (session.user as any).id;
    const { productUid, wishlistUid, name } = body;

    if (name && !productUid) {
      const newWishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        name: name.trim(),
        productUids: []
      });
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

    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la mise à jour de la wishlist :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
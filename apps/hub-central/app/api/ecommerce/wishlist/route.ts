import { NextResponse } from 'next/server';
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR WISHLIST GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR WISHLIST GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;
    
    let wishlists;
    try {
      wishlists = await WishlistModel.find({ userUid }).lean();
    } catch (queryErr) {
      console.error("🔥 [WISHLIST FIND ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture des listes de souhaits." }, { status: 500 });
    }
    
    if (!wishlists || wishlists.length === 0) {
      let defaultWishlist;
      try {
        defaultWishlist = await WishlistModel.create({
          uid: `wish_${uuidv4()}`,
          userUid,
          name: 'Favoris Principaux',
          productUids: []
        });
      } catch (createErr) {
        console.error("🔥 [DEFAULT WISHLIST CREATE ERROR]", createErr);
        return NextResponse.json({ error: "Échec de création de la liste par défaut." }, { status: 500 });
      }

      const obj = typeof defaultWishlist.toObject === 'function' ? defaultWishlist.toObject() : defaultWishlist;
      wishlists = [obj];
    }

    return NextResponse.json({ success: true, data: wishlists }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des wishlists :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR WISHLIST POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR WISHLIST POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;
    const { productUid, wishlistUid, name } = body;

    if (name && !productUid) {
      let newWishlist;
      try {
        newWishlist = await WishlistModel.create({
          uid: `wish_${uuidv4()}`,
          userUid,
          name: name.trim(),
          productUids: []
        });
      } catch (createErr) {
        console.error("🔥 [WISHLIST CREATE ERROR]", createErr);
        return NextResponse.json({ error: "Échec de la création de la liste." }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: newWishlist }, { status: 201 });
    }

    const query = wishlistUid ? { uid: wishlistUid, userUid } : { userUid };
    let wishlist;
    try {
      wishlist = await WishlistModel.findOne(query);
    } catch (queryErr) {
      console.error("🔥 [WISHLIST QUERY ERROR]", queryErr);
    }

    if (!wishlist) {
      try {
        wishlist = await WishlistModel.create({
          uid: `wish_${uuidv4()}`,
          userUid,
          name: name || 'Favoris Principaux',
          productUids: productUid ? [productUid] : []
        });
      } catch (createErr) {
        console.error("🔥 [WISHLIST FALLBACK CREATE ERROR]", createErr);
        return NextResponse.json({ error: "Échec de l'initialisation de la wishlist." }, { status: 500 });
      }
    } else if (productUid) {
      if (!wishlist.productUids.includes(productUid)) {
        wishlist.productUids.push(productUid);
      } else {
        wishlist.productUids = wishlist.productUids.filter((id: string) => id !== productUid);
      }
      if (typeof wishlist.save === 'function') {
        try {
          await wishlist.save();
        } catch (saveErr) {
          console.error("🔥 [WISHLIST SAVE ERROR]", saveErr);
          return NextResponse.json({ error: "Échec de la mise à jour des favoris." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la mise à jour de la wishlist :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
// apps/hub-central/app/api/ecommerce/wishlist/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { WishlistModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    await connectToDatabase();
    const userUid = (session.user as any).uid;
    const wishlist = await WishlistModel.findOne({ userUid });

    return NextResponse.json(wishlist || { productUids: [] }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture de la wishlist :", error);
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
    const userUid = (session.user as any).uid;
    const { productUid } = body;

    let wishlist = await WishlistModel.findOne({ userUid });
    if (wishlist) {
      if (!wishlist.productUids.includes(productUid)) {
        wishlist.productUids.push(productUid);
        await wishlist.save();
      }
    } else {
      wishlist = await WishlistModel.create({
        uid: `wish_${uuidv4()}`,
        userUid,
        productUids: [productUid]
      });
    }

    return NextResponse.json({ success: true, data: wishlist }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la mise à jour de la wishlist :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
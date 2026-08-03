// apps/hub-central/app/api/ecommerce/wishlist/[itemId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { itemId } = await params; // Ici itemId correspond soit au wishlistUid, soit au productUid selon l'usage
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // Tentative 1 : Supprimer toute la wishlist si l'ID correspond à une liste
    const deletedList = await WishlistModel.findOneAndDelete({ 
      uid: itemId, 
      userUid: userUid 
    });

    if (deletedList) {
      return NextResponse.json({ success: true, message: "Wishlist dissoute avec succès." }, { status: 200 });
    }

    // Tentative 2 : Sinon, retirer le produit de toutes les wishlists de l'utilisateur
    const updated = await WishlistModel.updateMany(
      { userUid: userUid },
      { $pull: { productUids: itemId } }
    );

    if (updated.modifiedCount === 0) {
      return NextResponse.json({ error: "Élément introuvable dans vos listes." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artefact retiré de la liste de souhaits." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur DELETE Wishlist :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
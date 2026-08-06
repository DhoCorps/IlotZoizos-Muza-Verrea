import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR WISHLIST DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let itemId;
    try {
      const resolvedParams = await params;
      itemId = resolvedParams.itemId;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant d'élément invalide." }, { status: 400 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR WISHLIST DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // Tentative 1 : Supprimer toute la wishlist si l'ID correspond à une liste
    let deletedList;
    try {
      deletedList = await WishlistModel.findOneAndDelete({ 
        uid: itemId, 
        userUid: userUid 
      });
    } catch (delErr) {
      console.error("🔥 [WISHLIST LIST DELETE ERROR]", delErr);
    }

    if (deletedList) {
      return NextResponse.json({ success: true, message: "Wishlist dissoute avec succès." }, { status: 200 });
    }

    // Tentative 2 : Sinon, retirer le produit de toutes les wishlists de l'utilisateur
    let updated;
    try {
      updated = await WishlistModel.updateMany(
        { userUid: userUid },
        { $pull: { productUids: itemId } }
      );
    } catch (updateErr) {
      console.error("🔥 [WISHLIST ITEM PULL ERROR]", updateErr);
      return NextResponse.json({ error: "Échec du retrait de l'artefact de la liste." }, { status: 500 });
    }

    if (updated.modifiedCount === 0) {
      return NextResponse.json({ error: "Élément introuvable dans vos listes." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artefact retiré de la liste de souhaits." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur DELETE Wishlist :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
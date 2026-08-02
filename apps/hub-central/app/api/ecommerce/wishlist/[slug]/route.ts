import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, WishlistModel } from '@ilot/infrastructure';

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

// ==========================================
// DELETE : Retirer un artefact de sa liste de souhaits
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { itemId } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const deleted = await WishlistModel.findOneAndDelete({ 
      uid: itemId, 
      userUid: userUid 
    });

    if (!deleted) {
      return NextResponse.json({ error: "Élément introuvable dans votre liste de souhaits." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artefact retiré de la liste de souhaits." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur DELETE Wishlist :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
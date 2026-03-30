import { NextResponse } from "next/server";
import { connectToDatabase, UserModel } from "@ilot/infrastructure";

// ⚠️ Crucial : On force Next.js à requêter la base à chaque fois, 
// sinon il risque de garder en cache une liste vide générée lors du build.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    
    // 🟢 On s'assure de demander l'email dans la sélection
    // Le .lean() permet d'avoir des objets JavaScript purs (plus légers)
    const users = await UserModel.find({}).select("uid username email").lean();

    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error: any) {
    console.error("❌ [GET USERS] Erreur :", error.message);
    return NextResponse.json({ error: "Impossible de récupérer le troupeau." }, { status: 500 });
  }
}
// apps/hub-central/app/api/users/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; 
import { connectToDatabase } from "@ilot/infrastructure/src/database/mongoose";
import { OiseauModel } from "@ilot/infrastructure/src/database/models/nosql/user.model";

export async function GET(req: Request) {
  try {
    // 🛡️ Passage obligatoire par la Douane (Sécurité contrôlée)
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Garde-frontière : Accès non autorisé, session manquante." }, 
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query: any = {};

    // 🏗️ Harmonisation sémantique : On utilise 'pseudo' et 'frequenceHEX'
    if (search) {
      query.$or = [
        { pseudo: { $regex: search, $options: 'i' } },
        { frequenceHEX: { $regex: search, $options: 'i' } }
      ];
    }

    // 🛰️ Récupération des oiseaux (password et email sont déjà exclus par le modèle)
    const oiseaux = await OiseauModel.find(query)
      .limit(20) 
      .lean();

    // 📦 Enveloppe pour l'intégrité du Test
    return NextResponse.json({ results: oiseaux });
    
  } catch (error) {
    console.error("🔥 Erreur lors du recensement :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux." }, { status: 500 });
  }
}
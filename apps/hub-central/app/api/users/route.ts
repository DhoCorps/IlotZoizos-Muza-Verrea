// apps/hub-central/app/api/users/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase, UserModel } from "@ilot/infrastructure";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // 🔍 Extraction des filtres depuis l'URL
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // 🏗️ Construction de la requête MongoDB
    let query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    // 🛰️ On récupère les oiseaux (en excluant le mot de passe pour la sécurité)
    const users = await UserModel.find(query)
      .select('-password')
      .sort({ lastActive: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("🔥 Erreur lors du recensement des oiseaux :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux." }, { status: 500 });
  }
}
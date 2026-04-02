export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Chemin à adapter selon ton architecture
import { connectToDatabase } from "../../../../../../packages/infrastructure";
import { TeamOrchestrator } from "../../../../../../packages/shared-core";

/**
 * 🦅 GET : Scanner la canopée pour trouver des oiseaux recrutables
 * URL : /api/users/recruitable?search=nom_de_l_oiseau
 */
export async function GET(request: Request) {
  try {
    // 🛡️ Vérification de la session pour la sécurité du ciel
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Identification requise pour scanner l'Îlot." }, { status: 401 });
    }

    // Extraction du terme de recherche
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search') || "";

    await connectToDatabase();
    
    // 🎯 Appel à l'orchestrateur (Le muscle)
    // Cette fonction utilise le flag 'isAvailableForTeamRequest'
    const birds = await TeamOrchestrator.getRecruitableBirds(query);

    return NextResponse.json(birds, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur Radar :", error);
    return NextResponse.json({ error: "Le radar est temporairement brouillé..." }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { TeamModel, connectToDatabase } from "@ilot/infrastructure";
import { TeamOrchestrator } from "../../../../../packages/shared-core";
import { TeamSchema } from "../../../../../packages/types";

/**
 * 📥 GET : Récupérer toutes les escouades de l'oiseau
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    await connectToDatabase();
    
    // On utilise l'UID de session (string) pour filtrer
    const teams = await TeamModel.find({
      $or: [
        { ownerId: session.user.uid },
        { leaderId: session.user.uid }
        // On pourrait aussi chercher via Neo4j pour plus de précision sur les membres
      ]
    }).lean();

    return NextResponse.json(teams, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

/**
 * 📤 POST : Créer une escouade via une requête API standard
 * Route : /api/teams
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validation Zod
    const validated = TeamSchema.safeParse({
      ...body,
      ownerId: session.user.uid
    });

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten() }, { status: 400 });
    }

    // Appel à l'orchestrateur pour la double-suture (Mongo + Neo4j)
    const result = await TeamOrchestrator.fosterTeam({
      name: validated.data.name,
      description: validated.data.description,
      creatorUid: session.user.uid,
      parentId: validated.data.parentId ?? undefined,
      category: validated.data.category || 'SOCIAL', 
      nuances: validated.data.nuances || [],
      isPrivate: validated.data.isPrivate ?? true
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
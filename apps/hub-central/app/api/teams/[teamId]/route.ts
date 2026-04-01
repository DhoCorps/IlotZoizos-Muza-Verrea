// apps/hub-central/app/api/users/route.ts -> (Déjà fait)
// apps/hub-central/app/api/teams/[teamId]/route.ts

import { NextResponse } from 'next/server';
import { connectToDatabase, TeamModel, getNeo4jSession } from "@ilot/infrastructure";

// 🏗️ ÉDITION DU NID (Mutation de structure)
export async function PUT(req: Request, { params }: { params: { teamId: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const updatedTeam = await TeamModel.findOneAndUpdate(
      { uid: params.teamId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedTeam) return NextResponse.json({ error: "Nid introuvable" }, { status: 404 });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    return NextResponse.json({ error: "Échec de la mutation du Nid" }, { status: 500 });
  }
}

// 🧨 DISSOLUTION DU NID (Effacement du Graphe et de la Silice)
export async function DELETE(req: Request, { params }: { params: { teamId: string } }) {
  const session = getNeo4jSession();
  try {
    await connectToDatabase();

    // 1. Suppression dans MongoDB
    await TeamModel.findOneAndDelete({ uid: params.teamId });

    // 2. Suppression dans Neo4j
    // On supprime le nœud Team et toutes les relations de nichage (:NESTING) 
    // qui le liaient aux oiseaux (Bird).
    await session.run(
      'MATCH (t:Team {uid: $uid}) DETACH DELETE t',
      { uid: params.teamId }
    );

    return NextResponse.json({ message: "Le Nid a été dissous. Les oiseaux ont pris leur envol." });
  } catch (error) {
    console.error("🔥 Erreur de dissolution :", error);
    return NextResponse.json({ error: "Le Nid résiste à la dissolution." }, { status: 500 });
  } finally {
    await session.close();
  }
}
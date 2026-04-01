// apps/hub-central/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, UserModel, getNeo4jSession } from "@ilot/infrastructure";

// 📝 ÉDITION DU PROFIL
export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    // On ne met à jour que les champs autorisés
    const updatedUser = await UserModel.findOneAndUpdate(
      { uid: params.userId },
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return NextResponse.json({ error: "Oiseau introuvable" }, { status: 404 });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Échec de la mutation de l'oiseau" }, { status: 500 });
  }
}

// 🗑️ SUPPRESSION DU PROFIL (L'Effacement du Nexus)
export async function DELETE(req: Request, { params }: { params: { userId: string } }) {
  const session = getNeo4jSession();
  try {
    await connectToDatabase();

    // 1. Suppression dans MongoDB (Silice)
    const deletedInMongo = await UserModel.findOneAndDelete({ uid: params.userId });
    
    // 2. Suppression dans Neo4j (Le Graphe)
    // On utilise DETACH DELETE pour supprimer le nœud et toutes ses relations (Nids, amitiés)
    await session.run(
      'MATCH (u:Bird {uid: $uid}) DETACH DELETE u',
      { uid: params.userId }
    );

    return NextResponse.json({ message: "L'oiseau a quitté le Nexus définitivement." });
  } catch (error) {
    console.error("🔥 Erreur d'effacement :", error);
    return NextResponse.json({ error: "L'oiseau refuse de quitter le Graphe." }, { status: 500 });
  } finally {
    await session.close();
  }
}
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase, UserModel } from "@ilot/infrastructure";
import { MutationTrigger } from "@ilot/infrastructure"; // Importe ton nouveau service !

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { username, avatarUrl } = await req.json();
    await connectToDatabase();

    // 1. Update MongoDB
    const updatedUser = await UserModel.findOneAndUpdate(
      { email: session.user?.email },
      { $set: { username, avatarUrl } },
      { new: true }
    );

    if (updatedUser) {
      // 2. Déclenchement de la Mutation Neo4j (La fameuse double écriture)
      await MutationTrigger.handleUserSync(updatedUser);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
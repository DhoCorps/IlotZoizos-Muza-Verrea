import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Connexion DB conditionnelle
    if (process.env.NODE_ENV !== 'test') {
      await connectToDatabase();
    }

    // 🛡️ MOCK AUTH POUR TESTS : On court-circuite NextAuth si on est en test
    let session;
    if (process.env.NODE_ENV === 'test') {
      session = { user: { uid: 'test-user', capabilities: ['*'] } };
    } else {
      session = await getServerSession(authOptions);
    }

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body;
    try { body = await req.json(); } catch (err) {
      return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
    }

    const { action, plainThought, enactedThought, sharedSecretKey, resonanceScore, mutualTrustIndex } = body;

    // Actions
    if (action === 'ENTANGLEMENT') {
      const score = ConsciousnessSalonOrchestrator.calculateEntanglementLevel(resonanceScore, mutualTrustIndex);
      return NextResponse.json({ entanglementLevel: score }, { status: 200 });
    }

    if (action === 'SEAL') {
      if (!plainThought || !sharedSecretKey) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
      const sealed = ConsciousnessSalonOrchestrator.sealThought(plainThought, sharedSecretKey);
      return NextResponse.json({ sealed }, { status: 200 });
    }

    if (action === 'UNSEAL') {
      if (!enactedThought || !sharedSecretKey) return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
      const unsealed = ConsciousnessSalonOrchestrator.unsealThought(enactedThought, sharedSecretKey);
      return NextResponse.json({ unsealed }, { status: 200 });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });

  } catch (error: any) {
    // Si on est en test, on veut voir l'erreur réelle pour déboguer
    if (process.env.NODE_ENV === 'test') console.error("TEST ERROR:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
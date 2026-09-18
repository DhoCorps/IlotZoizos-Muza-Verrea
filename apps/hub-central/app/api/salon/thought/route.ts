export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour les pensées quantiques du Salon
const SalonThoughtSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('ENTANGLEMENT'),
    resonanceScore: z.number({ message: "Le score de résonance est requis et doit être un nombre." }),
    mutualTrustIndex: z.number({ message: "L'indice de confiance mutuelle est requis et doit être un nombre." }),
  }),
  z.object({
    action: z.literal('SEAL'),
    plainThought: z.string({ message: "La matière de la pensée est requise." }).min(1, "La pensée ne peut être vide."),
    sharedSecretKey: z.string({ message: "La clé secrète partagée est requise." }).min(1, "La clé est requise."),
  }),
  z.object({
    action: z.literal('UNSEAL'),
    enactedThought: z.object({
      ciphertext: z.string(),
      iv: z.string(),
      tag: z.string(),
      timestamp: z.number(),
    }).passthrough(),
    sharedSecretKey: z.string({ message: "La clé secrète partagée est requise." }).min(1, "La clé est requise."),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    // Connexion standardisée à la base de données (totalement agnostique du contexte d'exécution)
    await connectToDatabase();

    // Récupération standard de la session via NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    let body: unknown;
    try { 
      body = await req.json(); 
    } catch {
      return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
    }

    const validationResult = SalonThoughtSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Paramètres incomplets ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Actions
    if (validatedData.action === 'ENTANGLEMENT') {
      const score = ConsciousnessSalonOrchestrator.calculateEntanglementLevel(
        validatedData.resonanceScore, 
        validatedData.mutualTrustIndex
      );
      return NextResponse.json({ entanglementLevel: score }, { status: 200 });
    }

    if (validatedData.action === 'SEAL') {
      const sealed = ConsciousnessSalonOrchestrator.sealThought(
        validatedData.plainThought, 
        validatedData.sharedSecretKey
      );
      return NextResponse.json({ sealed }, { status: 200 });
    }

    if (validatedData.action === 'UNSEAL') {
      const unsealed = ConsciousnessSalonOrchestrator.unsealThought(
        validatedData.enactedThought, 
        validatedData.sharedSecretKey
      );
      return NextResponse.json({ unsealed }, { status: 200 });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });

  } catch (error: unknown) {
    return handleRouteError(error, 'SALON THOUGHT POST ERROR');
  }
}
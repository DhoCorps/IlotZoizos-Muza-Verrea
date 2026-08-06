import { NextResponse } from 'next/server';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Pensée insaisissable (Requête illisible)." }, { status: 400 });
  }

  const { action, plainThought, enactedThought, sharedSecretKey, resonanceScore, mutualTrustIndex } = body;

  // 1. Calcul de l'intrication quantique de la conscience partagée (C = S ⊗ B)
  if (action === 'ENTANGLEMENT') {
    try {
      const score = ConsciousnessSalonOrchestrator.calculateEntanglementLevel(resonanceScore, mutualTrustIndex);
      return NextResponse.json({ entanglementLevel: score }, { status: 200 });
    } catch (err: any) {
      console.error("🔥 [SALON ENTANGLEMENT ERROR]", err);
      return NextResponse.json({ error: "Le calcul quantique a échoué." }, { status: 500 });
    }
  }

  // 2. Scellement d'une pensée (Chiffrement de bout en bout E2EE)
  if (action === 'SEAL') {
    if (!plainThought || !sharedSecretKey) {
      return NextResponse.json({ error: 'Pensée en clair ou clé secrète manquante.' }, { status: 400 });
    }
    try {
      // 🪡 CORRECTION : On utilise bien sealThought ici, et on retourne 'sealed'
      const sealed = ConsciousnessSalonOrchestrator.sealThought(plainThought, sharedSecretKey);
      return NextResponse.json({ sealed }, { status: 200 });
    } catch (err: any) {
      console.error("🔥 [SALON SEAL ERROR]", err);
      return NextResponse.json({ error: "Le rituel de scellement a échoué." }, { status: 500 });
    }
  }

  // 3. Dés-enchâssement d'une pensée chiffrée
  if (action === 'UNSEAL') {
    if (!enactedThought || !sharedSecretKey) {
      return NextResponse.json({ error: 'Cryptogramme ou clé secrète manquante.' }, { status: 400 });
    }
    try {
      // 🪡 SUTURE TypeScript : on force enactedThought en "any" pour éviter l'erreur de typage strict
      const unsealed = ConsciousnessSalonOrchestrator.unsealThought(enactedThought as any, sharedSecretKey);
      return NextResponse.json({ unsealed }, { status: 200 });
    } catch (err: any) {
      console.error("🔥 [SALON UNSEAL ERROR]", err);
      return NextResponse.json({ error: "La clé est fausse ou la pensée corrompue." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Action non reconnue dans le Salon Privé.' }, { status: 400 });
}
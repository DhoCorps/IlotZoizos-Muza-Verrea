import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure'; 
import { OiseauOrchestrator } from '@ilot/shared-core';

/**
 * 🐣 POST : L'Éclosion (Inscription d'un nouvel Oiseau)
 * Cette route est publique et délègue la forge de l'entité à l'Orchestrateur.
 */
export async function POST(req: Request) {
  try {
    // 🛡️ 1. Éveil de la Silice
    await connectToDatabase();
    
    const { email, password, pseudo, frequenceHEX } = await req.json();

    // 🛡️ 2. Validation de la Graine (Incompressible)
    if (!email || !password || !pseudo) {
      return NextResponse.json(
        { message: "L'onde est incomplète (Email, Pseudo et Mot de passe requis)." }, 
        { status: 400 }
      );
    }

    // 🛰️ 3. L'ACTION : L'Orchestrateur gère la transaction (Hachage, Mongo, Neo4j)
    const oiseauOrch = new OiseauOrchestrator();

    // On utilise fosterOiseau. Pas besoin de Signature car l'Oiseau n'est pas encore né.
    const syncResult = await oiseauOrch.fosterOiseau({
      email,
      password, // La Forge se charge du hachage de sécurité
      pseudo,
      frequenceHEX: frequenceHEX || '#2F4F4F', // Par défaut : Gris Bleuté (Stase)
    });

    const nouvelOiseau = syncResult.mongo;

    // ✨ 4. LA SUTURE : Message harmonisé avec auth.lifecycle.spec.ts
    return NextResponse.json({
      message: "L'oiseau a rejoint l'Îlot !",
      oiseau: { 
        uid: nouvelOiseau.uid,
        pseudo: nouvelOiseau.pseudo, 
        frequence: nouvelOiseau.frequenceHEX 
      }
    }, { status: 201 });

  } catch (error: any) {
    // 🚨 5. Gestion du Caprice (Erreurs métiers comme un email déjà pris)
    const status = error.statusCode || 500;
    console.error("🔥 Caprice au seuil (Inscription) :", error.message);
    
    return NextResponse.json(
        { message: error.message || "L'Îlot repousse cette tentative." }, 
        { status }
    );
  }
}
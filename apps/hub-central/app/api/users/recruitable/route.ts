// apps/hub-central/app/api/users/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { OiseauModel } from "@ilot/infrastructure";
import { OiseauOrchestrator } from "@ilot/shared-core"; // ✅ Import correct de la Forge
// import { authOptions } from "../../../lib/auth"; // Décommente si nécessaire

/**
 * 🔍 GET : Recensement des Oiseaux (La Volière Publique)
 * (Je garde ton code, la mécanique de recherche par Aura est superbe)
 */
export async function GET(req: Request) {
  try {
    // 🛡️ DOUANE : Il faut au moins être un Oiseau pour voir les autres Oiseaux
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }

    // 🔍 Extraction des filtres depuis l'URL
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query: any = {};

    if (search) {
      // SUTURE : On utilise "pseudo" et "aura"
      query.$or = [
        { pseudo: { $regex: search, $options: 'i' } },
        { capabilities: { $regex: search, $options: 'i' } } 
      ];
    }

    // 🛰️ On récupère les oiseaux (en protégeant les données sensibles)
    const users = await OiseauModel.find(query)
      .select('uid pseudo frequenceHEX aura signature') // On ne renvoie QUE ce qui est public
      .sort({ createdAt: -1 })
      .limit(20) 
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("🔥 Erreur lors du recensement des oiseaux :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux." }, { status: 500 });
  }
}

/**
 * 🐣 POST : Éclosion d'un Oiseau (Inscription)
 * Attention : Cette route doit rester publique. Pas de Signature ici.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🛡️ Validation de base avant d'appeler l'Orchestrateur
    if (!body.email || !body.pseudo || !body.password) {
      return NextResponse.json(
        { error: "L'œuf est incomplet (Email, Pseudo et Mot de passe requis)." }, 
        { status: 400 }
      );
    }

    // 🛡️ On vérifie l'unicité dans la Silice avant de déranger le Graphe
    const existingUser = await OiseauModel.findOne({ 
      $or: [{ email: body.email }, { pseudo: body.pseudo }] 
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet oiseau chante déjà dans une autre cage (Email ou Pseudo déjà pris)." }, 
        { status: 400 }
      );
    }

    // 🌟 LA MAGIE DE L'ORCHESTRATEUR (La vraie Suture !)
    const orchestrator = new OiseauOrchestrator(); // ✅ Instanciation propre de la Forge

    // L'Orchestrateur gère la transaction Mongo+Neo4j et le Hash du mot de passe
    const syncResult = await orchestrator.fosterOiseau({
      email: body.email,
      pseudo: body.pseudo,
      password: body.password, 
      frequenceHEX: body.frequenceHEX || '#8b9dc3'
    });

    // L'orchestrateur renvoie un SyncResult complet (on extrait la data Mongo pour le client)
    const nouvelOiseau = syncResult.mongo;

    return NextResponse.json({
      success: true,
      message: "L'oiseau a éclos dans le Nexus et dans le Graphe !",
      uid: nouvelOiseau.uid
    }, { status: 201 });

  } catch (error: any) {
    // Si l'erreur vient de la Forge (IlotError), on récupère le bon statut
    const status = error.statusCode || 500;
    console.error("🔥 Erreur d'éclosion :", error);
    return NextResponse.json({ error: error.message || "L'œuf a été brisé lors de l'éclosion." }, { status });
  }
}
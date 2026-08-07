import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from "@ilot/infrastructure"; // 🪡 Import propre, sans chemin profond
import { OiseauOrchestrator } from "@ilot/shared-core"; 
import { authOptions } from "@/lib/auth"; // Ajuste le chemin relatif si besoin

export const dynamic = 'force-dynamic';

/**
 * 🔍 GET : Recensement des Oiseaux (La Volière Publique)
 */
export async function GET(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR USERS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. DOUANE : SÉCURISATION DE L'ACCÈS
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 3. RECHERCHE PAR SLUG, PSEUDO OU CAPACITÉS
    // -------------------------------------------------------------------------
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query: any = {};

    if (search) {
      query.$or = [
        { slug: { $regex: search, $options: 'i' } }, // 🪡 Recherche prioritaire par slug
        { pseudo: { $regex: search, $options: 'i' } },
        { capabilities: { $regex: search, $options: 'i' } } 
      ];
    }

    // 🛰️ Extraction chirurgicale : uniquement les données publiques
    const users = await OiseauModel.find(query)
      .select('uid slug pseudo frequenceHEX capabilities signature') // On garantit l'exposition du slug
      .sort({ createdAt: -1 })
      .limit(20) 
      .lean();

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("🔥 Erreur lors du recensement des oiseaux :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux." }, { status: 500 });
  }
}

/**
 * 🐣 POST : Éclosion d'un Oiseau (Inscription)
 * Attention : Cette route est publique (pas de session requise).
 */
export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR USERS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "L'œuf est muet : Corps de requête invalide" }, { status: 400 });
    }

    // 🛡️ Validation de base
    if (!body.email || !body.pseudo || !body.password) {
      return NextResponse.json(
        { error: "L'œuf est incomplet (Email, Pseudo et Mot de passe requis)." }, 
        { status: 400 }
      );
    }

    // 🛡️ On vérifie l'unicité dans la Silice avant de solliciter le Graphe
    const existingUser = await OiseauModel.findOne({ 
      $or: [{ email: body.email }, { pseudo: body.pseudo }] 
    }).lean();

    if (existingUser) {
      // Unicité violée, on renvoie un statut 409 (Conflict)
      return NextResponse.json(
        { error: "Cet oiseau chante déjà dans une autre cage (Email ou Pseudo déjà pris)." }, 
        { status: 409 }
      );
    }

    // 🌟 LA MAGIE DE L'ORCHESTRATEUR
    let syncResult;
    try {
      const orchestrator = new OiseauOrchestrator();
      syncResult = await orchestrator.fosterOiseau({
        email: body.email,
        pseudo: body.pseudo,
        password: body.password, 
        frequenceHEX: body.frequenceHEX || '#8b9dc3'
      });
    } catch (orchErr: any) {
      console.error("🌋 [OISEAU ORCHESTRATOR ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'œuf a été brisé lors de l'éclosion." }, { status });
    }

    const nouvelOiseau = syncResult.mongo || syncResult;

    return NextResponse.json({
      success: true,
      message: "L'oiseau a éclos dans le Nexus et dans le Graphe !",
      uid: nouvelOiseau.uid,
      slug: nouvelOiseau.slug // On renvoie le slug nouvellement forgé
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur d'éclosion :", error);
    return NextResponse.json({ error: "L'œuf a été brisé lors de l'éclosion." }, { status: 500 });
  }
}
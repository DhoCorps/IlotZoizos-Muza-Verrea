import { NextResponse } from 'next/server';
import { connectToDatabase, FontProject } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // 🪡 Ajuste la profondeur si nécessaire

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR LETRIN FONTS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let projects;
    try {
      projects = await FontProject.find({}).sort({ updatedAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [LETRIN FONTS QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture des projets Letr'In." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: projects }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR LETRIN FONTS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Sédimentation refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR LETRIN FONTS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let newProject;
    try {
      newProject = await FontProject.create(body);
    } catch (createErr) {
      console.error("🔥 [LETRIN FONTS CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation du projet." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
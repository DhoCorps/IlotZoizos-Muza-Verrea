import { NextResponse } from 'next/server';
import { connectToDatabase, FontProject } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth"; // 🪡 Ajuste la profondeur si nécessaire

// 🪡 Next.js impose que `params` soit traité comme une Promise
interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR FONTS PUT]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Mutation refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR FONTS PUT]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    
    let resolvedParams;
    let body;
    try {
      resolvedParams = await params;
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: "Requête ou paramètres invalides." }, { status: 400 });
    }

    let updated;
    try {
      // 🪡 On utilise le slug comme ID
      updated = await FontProject.findByIdAndUpdate(resolvedParams.slug, body, { new: true }).lean();
    } catch (updateErr) {
      console.error("🔥 [FONTS PUT UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du projet." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR FONTS DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Dissolution refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR FONTS DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    let deleted;
    try {
      deleted = await FontProject.findByIdAndDelete(resolvedParams.slug);
    } catch (delErr) {
      console.error("🔥 [FONTS DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Échec de la dissolution du projet." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Projet introuvable pour dissolution." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Projet dissous avec succès." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
}
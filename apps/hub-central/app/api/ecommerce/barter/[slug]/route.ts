import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase, BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une offre de troc précise
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR BARTER GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAMS ERROR BARTER GET]", paramErr);
      return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });
    }
    
    let barter;
    try {
      barter = await BarterOfferModel.findOne({ uid: slug }).lean();
    } catch (queryErr) {
      console.error("🔥 [BARTER QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture dans la matrice." }, { status: 500 });
    }

    if (!barter) {
      return NextResponse.json({ error: "Offre de troc introuvable dans la matrice." }, { status: 404 });
    }
    
    return NextResponse.json(barter, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur fatale GET Barter :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// PATCH : Résoudre ou accepter/rejeter le troc
// ==========================================
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR BARTER PATCH]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR BARTER PATCH]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAMS ERROR BARTER PATCH]", paramErr);
      return NextResponse.json({ error: "Identifiant d'offre invalide." }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("🔥 [PARSE ERROR BARTER PATCH]", parseErr);
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    
    let result;
    try {
      result = await ecommerceOrch.resolveBarter({
        barterUid: slug,
        acceptorUid: userUid,
        status: body.status || (body.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED')
      }, signature);
    } catch (orchErr: any) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR RESOLVE ERROR]", orchErr);
      const status = orchErr.statusCode || 400;
      return NextResponse.json({ error: orchErr.message || "Échec de résolution du troc." }, { status });
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur fatale PATCH Barter :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}
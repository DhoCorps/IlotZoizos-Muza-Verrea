import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une boutique par son slug ou uid
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR STORE GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de boutique invalide." }, { status: 400 });
    }
    
    let store;
    try {
      store = await StoreModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [STORE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture de la boutique." }, { status: 500 });
    }

    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable dans la Silice." }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Store :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// DELETE : Dissolution / Fermeture d'une Boutique
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR STORE DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de boutique invalide." }, { status: 400 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR STORE DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let store;
    try {
      store = await StoreModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [STORE DELETE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche de la boutique." }, { status: 500 });
    }

    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    try {
      const ecommerceOrch = new EcommerceOrchestrator();
      if (typeof (ecommerceOrch as any).dissolveStore === 'function') {
        await (ecommerceOrch as any).dissolveStore(store.uid, signature);
      } else {
        await StoreModel.deleteOne({ uid: store.uid });
      }
    } catch (orchErr: any) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR DISSOLVE ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la dissolution de la boutique." }, { status });
    }

    return NextResponse.json({ success: true, message: "La boutique a été dissoute de la matrice." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur DELETE Store :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}
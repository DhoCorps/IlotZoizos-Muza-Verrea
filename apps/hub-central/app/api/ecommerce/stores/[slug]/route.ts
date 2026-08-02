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
    await connectToDatabase();
    const { slug } = await params;
    
    const store = await StoreModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    }).lean();

    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable dans la Silice." }, { status: 404 });
    }

    return NextResponse.json(store, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Store :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// DELETE : Dissolution / Fermeture d'une Boutique
// ==========================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const store = await StoreModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!store) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    
    if (typeof (ecommerceOrch as any).dissolveStore === 'function') {
      await (ecommerceOrch as any).dissolveStore(store.uid, signature);
    } else {
      await StoreModel.deleteOne({ uid: store.uid });
    }

    return NextResponse.json({ success: true, message: "La boutique a été dissoute de la matrice." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur DELETE Store :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
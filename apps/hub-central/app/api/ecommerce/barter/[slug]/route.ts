import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une offre de troc précise
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const barter = await BarterOfferModel.findOne({ uid: slug }).lean();
    if (!barter) {
      return NextResponse.json({ error: "Offre de troc introuvable dans la matrice." }, { status: 404 });
    }
    
    return NextResponse.json(barter, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Barter :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PATCH : Résoudre ou accepter/rejeter le troc
// ==========================================
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const body = await req.json();
    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    
    const result = await ecommerceOrch.resolveBarter({
      barterUid: slug,
      acceptorUid: userUid,
      status: body.status || (body.action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED')
    }, signature);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur PATCH Barter :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
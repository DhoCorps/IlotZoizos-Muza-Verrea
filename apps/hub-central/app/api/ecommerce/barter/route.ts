// apps/hub-central/app/api/ecommerce/barter/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    await connectToDatabase();
    const offers = await BarterOfferModel.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    return NextResponse.json(offers, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des offres de troc :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Troc rejeté." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const initiatorUid = (session.user as any).uid;
    const barterUid = `barter_${uuidv4()}`;

    const newOffer = await BarterOfferModel.create({
      ...body,
      uid: barterUid,
      initiatorUid,
      status: 'PENDING'
    });

    const orchestrator = new EcommerceOrchestrator();
    await orchestrator.proposeBarter(
      { uid: barterUid, initiatorUid, receiverUid: body.receiverUid, offeredUids: body.offeredProductUids, requestedUids: body.requestedProductUids },
      { actorUid: initiatorUid, capabilities: (session.user as any).capabilities || [] }
    );

    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la proposition de troc :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { barterUid, status } = body; // 'ACCEPTED' | 'REJECTED'
    const acceptorUid = (session.user as any).uid;

    const updated = await BarterOfferModel.findOneAndUpdate(
      { uid: barterUid },
      { $set: { status } },
      { new: true }
    );

    const orchestrator = new EcommerceOrchestrator();
    await orchestrator.resolveBarter(
      { barterUid, acceptorUid, status },
      { actorUid: acceptorUid, capabilities: (session.user as any).capabilities || [] }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la résolution du troc :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { connectToDatabase, BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR BARTER MAIN GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let offers;
    try {
      offers = await BarterOfferModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [BARTER LIST QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec du recensement des offres." }, { status: 500 });
    }

    return NextResponse.json(offers, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des offres de troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR BARTER POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Troc rejeté." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR BARTER POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const initiatorUid = (session.user as any).uid;
    const barterUid = `barter_${uuidv4()}`;

    let newOffer;
    try {
      newOffer = await BarterOfferModel.create({
        ...body,
        uid: barterUid,
        initiatorUid,
        status: 'PENDING'
      });
    } catch (createErr) {
      console.error("🔥 [BARTER CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la création de l'offre en base." }, { status: 500 });
    }

    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.proposeBarter(
        { uid: barterUid, initiatorUid, receiverUid: body.receiverUid, offeredUids: body.offeredProductUids, requestedUids: body.requestedProductUids },
        { actorUid: initiatorUid, capabilities: (session.user as any).capabilities || [] }
      );
    } catch (orchErr) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR PROPOSE ERROR]", orchErr);
      // Optionnel: suppression de l'offre Mongo si l'orchestrateur échoue, ou gestion de rollback
    }

    return NextResponse.json({ success: true, data: newOffer }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la proposition de troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR BARTER PATCH MAIN]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR BARTER PATCH MAIN]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { barterUid, status } = body; 
    const acceptorUid = (session.user as any).uid;

    let updated;
    try {
      updated = await BarterOfferModel.findOneAndUpdate(
        { uid: barterUid },
        { $set: { status } },
        { new: true }
      );
    } catch (updateErr) {
      console.error("🔥 [BARTER UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mise à jour en base." }, { status: 500 });
    }

    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.resolveBarter(
        { barterUid, acceptorUid, status },
        { actorUid: acceptorUid, capabilities: (session.user as any).capabilities || [] }
      );
    } catch (orchErr) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR RESOLVE MAIN ERROR]", orchErr);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la résolution du troc :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}
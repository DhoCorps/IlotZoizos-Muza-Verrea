import { NextResponse } from 'next/server';
import { connectToDatabase, StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify';

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR STORES GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let stores;
    try {
      stores = await StoreModel.find({ isVerified: true }).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [STORES QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec du recensement des boutiques." }, { status: 500 });
    }

    return NextResponse.json(stores, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des boutiques :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR STORES POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Création de boutique refusée." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR STORES POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const ownerUid = (session.user as any).uid;
    const storeUid = `store_${uuidv4()}`;

    // 1. Génération du Slug Unique
    const baseSlug = slugify(body.storeName || 'boutique');
    let finalSlug = baseSlug;
    
    let slugExists;
    try {
      slugExists = await StoreModel.findOne({ slug: finalSlug });
    } catch (slugErr) {
      console.error("🔥 [SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await StoreModel.findOne({ slug: finalSlug });
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    // 2. Enregistrement dans MongoDB
    let newStore;
    try {
      newStore = await StoreModel.create({
        ...body,
        uid: storeUid,
        ownerUid,
        slug: finalSlug,
        isVerified: true
      });
    } catch (createErr) {
      console.error("🔥 [STORE CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de la boutique en base." }, { status: 500 });
    }

    // 3. Synchronisation Neo4j (Non-bloquant)
    try {
      const orchestrator = new EcommerceOrchestrator();
      await orchestrator.createStore(
        { 
          uid: storeUid, 
          ownerUid, 
          storeName: body.storeName, 
          slug: finalSlug, 
          stripeAccountId: body.stripeAccountId 
        },
        { actorUid: ownerUid, capabilities: (session.user as any).capabilities || [] }
      );
    } catch (neoError) {
      console.error("⚠️ Fracture mineure Neo4j lors de la création de la boutique :", neoError);
    }

    return NextResponse.json({
      success: true,
      message: "Boutique scellée avec succès dans l'Îlot.",
      data: newStore
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la création de la boutique :", error);
    return NextResponse.json({ error: error.message || "Échec de la création." }, { status: 500 });
  }
}
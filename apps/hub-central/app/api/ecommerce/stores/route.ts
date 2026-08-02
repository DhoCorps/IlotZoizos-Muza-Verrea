import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { StoreModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify'; // 🪡 Import du générateur d'URL

export async function GET() {
  try {
    await connectToDatabase();
    const stores = await StoreModel.find({ isVerified: true }).sort({ createdAt: -1 });
    return NextResponse.json(stores, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des boutiques :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Création de boutique refusée." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const ownerUid = (session.user as any).uid;
    const storeUid = `store_${uuidv4()}`;

    // 🪡 1. Génération du Slug Unique
    let baseSlug = slugify(body.storeName);
    let finalSlug = baseSlug;
    
    let slugExists = await StoreModel.findOne({ slug: finalSlug });
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await StoreModel.findOne({ slug: finalSlug });
      counter++;
    }

    // 2. Enregistrement dans MongoDB
    const newStore = await StoreModel.create({
      ...body,
      uid: storeUid,
      ownerUid,
      slug: finalSlug, // Injection de la belle URL
      isVerified: true
    });

    // 3. Synchronisation dans le graphe Neo4j via l'orchestrateur
    const orchestrator = new EcommerceOrchestrator();
    try {
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
      // Le bloc try/catch empêche une erreur Neo4j d'annuler le retour réussi de MongoDB
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
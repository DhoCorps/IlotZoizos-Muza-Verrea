import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';

export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PRODUCTS GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL invalide." }, { status: 400 });
    }

    const searchParams = url.searchParams;
    const storeUid = searchParams.get('storeUid');
    const category = searchParams.get('category');

    const query: any = {};
    if (storeUid) query.storeUid = storeUid;
    if (category) query.category = category;

    let products;
    try {
      products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [PRODUCTS QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de la lecture des artefacts." }, { status: 500 });
    }

    return NextResponse.json(products, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des artefacts :", error);
    return NextResponse.json({ error: error.message || "Échec de la lecture." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PRODUCTS POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Dépôt refusé." }, { status: 401 });
    }

    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PRODUCTS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;
    const productUid = `prod_${uuidv4()}`;

    // Génération et unicité du Slug
    const baseSlug = slugify(body.title || 'artefact');
    let finalSlug = baseSlug;
    
    let slugExists;
    try {
      slugExists = await ProductModel.findOne({ slug: finalSlug });
    } catch (slugErr) {
      console.error("🔥 [SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await ProductModel.findOne({ slug: finalSlug });
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    let newProduct;
    try {
      newProduct = await ProductModel.create({
        ...body,
        uid: productUid,
        slug: finalSlug,
        sellerUid: body.sellerUid || userUid
      });
    } catch (createErr) {
      console.error("🔥 [PRODUCT CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de l'artefact." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Artefact ajouté au catalogue de l'Îlot.",
      data: newProduct
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de l'ajout de l'artefact :", error);
    return NextResponse.json({ error: error.message || "Échec de l'ajout." }, { status: 500 });
  }
}
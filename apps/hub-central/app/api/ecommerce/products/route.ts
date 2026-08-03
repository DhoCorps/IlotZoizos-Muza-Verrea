// apps/hub-central/app/api/ecommerce/products/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '../../../../lib/slugify';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const storeUid = searchParams.get('storeUid');
    const category = searchParams.get('category');

    const query: any = {};
    if (storeUid) query.storeUid = storeUid;
    if (category) query.category = category;

    const products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture des artefacts :", error);
    return NextResponse.json({ error: error.message || "Échec de la lecture." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Dépôt refusé." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const userUid = (session.user as any).uid || (session.user as any).id;
    const productUid = `prod_${uuidv4()}`;

    // Génération et unicité du Slug
    const baseSlug = slugify(body.title || 'artefact');
    let finalSlug = baseSlug;
    
    let slugExists = await ProductModel.findOne({ slug: finalSlug });
    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      slugExists = await ProductModel.findOne({ slug: finalSlug });
      counter++;
    }

    // Enregistrement dans MongoDB avec attribution du créateur (sellerUid)
    const newProduct = await ProductModel.create({
      ...body,
      uid: productUid,
      slug: finalSlug,
      sellerUid: body.sellerUid || userUid
    });

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
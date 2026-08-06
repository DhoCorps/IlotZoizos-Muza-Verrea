import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PRODUCT GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Slug de produit invalide." }, { status: 400 });
    }
    
    let product;
    try {
      product = await ProductModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [PRODUCT QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture de l'artefact." }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Product :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR PRODUCT DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Slug de produit invalide." }, { status: 400 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR PRODUCT DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let product;
    try {
      product = await ProductModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      });
    } catch (queryErr) {
      console.error("🔥 [PRODUCT DELETE QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de recherche de l'artefact." }, { status: 500 });
    }

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    try {
      const ecommerceOrch = new EcommerceOrchestrator();
      if (typeof (ecommerceOrch as any).removeProduct === 'function') {
        await (ecommerceOrch as any).removeProduct(product.uid, signature);
      } else {
        await ProductModel.deleteOne({ uid: product.uid });
      }
    } catch (orchErr: any) {
      console.error("🔥 [ECOMMERCE ORCHESTRATOR REMOVE ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la suppression de l'artefact." }, { status });
    }

    return NextResponse.json({ success: true, message: "L'artefact a été retiré de la matrice." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur DELETE Product :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
}
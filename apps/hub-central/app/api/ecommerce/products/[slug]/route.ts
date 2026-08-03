// apps/hub-central/app/api/ecommerce/products/[slug]/route.ts
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
    await connectToDatabase();
    const { slug } = await params;
    
    const product = await ProductModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    }).lean();

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable dans l'Îlot." }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Product :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const product = await ProductModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!product) {
      return NextResponse.json({ error: "Artefact introuvable." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: sessionCaps
    };

    const ecommerceOrch = new EcommerceOrchestrator();
    
    if (typeof (ecommerceOrch as any).removeProduct === 'function') {
      await (ecommerceOrch as any).removeProduct(product.uid, signature);
    } else {
      await ProductModel.deleteOne({ uid: product.uid });
    }

    return NextResponse.json({ success: true, message: "L'artefact a été retiré de la matrice." }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur DELETE Product :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';

export async function GET(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR MARKETPLACE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const searchParams = url.searchParams;
    const category = searchParams.get('category');
    const style = searchParams.get('style');
    const author = searchParams.get('author');

    // 🛡️ Typage plus strict que "any" pour la requête Mongoose
    const query: Record<string, any> = {};
    
    if (category && category !== 'ALL') {
      query.category = category;
    }
    
    if (style && style !== 'ALL') {
      query.$or = [
        { style: { $regex: style, $options: 'i' } },
        { tags: { $in: [new RegExp(style, 'i')] } }
      ];
    }
    
    if (author && author !== 'ALL') {
      query.author = { $regex: author, $options: 'i' };
    }

    let products;
    try {
      products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [MARKETPLACE MONGODB QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec du recensement des artefacts dans la Silice." }, { status: 500 });
    }

    // 🕸️ ENRICHISSEMENT POUR LA RÉSONANCE (Le Front en a besoin)
    const enrichedProducts = products.map((product: any) => ({
      ...product,
      // Si on n'a pas explicitement de authorSlug, on fallback sur le ownerUid du produit.
      // Cela permet au bouton de Résonance de cibler le bon Oiseau dans Neo4j.
      authorSlug: product.authorSlug || product.ownerUid || product.storeOwnerUid || null
    }));

    return NextResponse.json({ success: true, data: enrichedProducts }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement du Marketplace :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de la Marketplace." }, { status: 500 });
  }
}
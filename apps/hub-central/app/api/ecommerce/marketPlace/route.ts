// apps/hub-central/app/api/ecommerce/marketPlace/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';

// 🪡 Forcer le comportement dynamique pour éviter l'erreur de pré-rendu statique
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    
    const category = searchParams.get('category');
    const style = searchParams.get('style');
    const author = searchParams.get('author');

    // Construction dynamique de la requête Mongoose
    const query: any = {};
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

    const products = await ProductModel.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: products }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement du Marketplace :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
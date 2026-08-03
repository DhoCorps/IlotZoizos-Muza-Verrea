import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';

export async function GET() {
  try {
    await connectToDatabase();

    const visuals = await ProductModel.find({ 
      category: { $in: ['FONT_SPRITE', 'GRAPHIC', 'VIDEO', 'CINEMA'] } 
    }).limit(20).lean();

    const tracks = await ProductModel.find({ 
      category: { $in: ['MUSIC', 'AUDIO', 'PARTITA'] } 
    }).limit(20).lean();

    return NextResponse.json({ 
      success: true, 
      data: {
        visuals: visuals.sort(() => Math.random() - 0.5),
        tracks: tracks.sort(() => Math.random() - 0.5)
      } 
    }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur flux média Agora :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
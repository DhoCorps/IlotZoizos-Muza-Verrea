import { NextResponse } from 'next/server';
import { connectToDatabase, ProductModel } from '@ilot/infrastructure';

export async function GET() {
  try {
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error("❌ [DB ERROR MEDIA STREAM FEED]", dbError);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let visuals: any[] = [];
    let tracks: any[] = [];

    try {
      visuals = await ProductModel.find({ 
        category: { $in: ['FONT_SPRITE', 'GRAPHIC', 'VIDEO', 'CINEMA'] } 
      }).limit(20).lean();
    } catch (visError) {
      console.error("⚠️ [MEDIA STREAM FEED] Erreur de récupération des visuels :", visError);
    }

    try {
      tracks = await ProductModel.find({ 
        category: { $in: ['MUSIC', 'AUDIO', 'PARTITA'] } 
      }).limit(20).lean();
    } catch (trackError) {
      console.error("⚠️ [MEDIA STREAM FEED] Erreur de récupération des pistes :", trackError);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        visuals: visuals.sort(() => Math.random() - 0.5),
        tracks: tracks.sort(() => Math.random() - 0.5)
      } 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur flux média Agora :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du flux média." }, { status: 500 });
  }
}
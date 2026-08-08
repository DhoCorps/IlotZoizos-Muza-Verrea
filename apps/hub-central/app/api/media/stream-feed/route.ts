export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { ProductModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Flux média mis en cache brièvement (30s) avec bypass en mode test
async function getCachedMediaFeed() {
  const fetcher = async () => {
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

    return { visuals, tracks };
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['media-stream-feed'],
    { revalidate: 30, tags: ['media-feed', 'products'] }
  )();
}

// ==========================================
// 🔍 GET : Flux des médias (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const { visuals, tracks } = await getCachedMediaFeed();

    // Mélange aléatoire propre post-récupération
    const shuffledVisuals = [...visuals].sort(() => Math.random() - 0.5);
    const shuffledTracks = [...tracks].sort(() => Math.random() - 0.5);

    return NextResponse.json({ 
      success: true, 
      data: {
        visuals: shuffledVisuals,
        tracks: shuffledTracks
      } 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur flux média Agora :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du flux média." }, { status: 500 });
  }
});
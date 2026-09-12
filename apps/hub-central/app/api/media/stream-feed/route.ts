// Fichier : app/api/stream-feed/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedMediaFeed } from '@/lib/cache/media.cache';

// ==========================================
// 📺 GET : Flux des médias (Public / Silice)[cite: 9]
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const { visuals, tracks } = await getCachedMediaFeed();
    
    // Mélange aléatoire propre post-récupération[cite: 9]
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
    console.error("  Erreur flux média Agora :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du flux média." }, { status: 500 });
  }
});
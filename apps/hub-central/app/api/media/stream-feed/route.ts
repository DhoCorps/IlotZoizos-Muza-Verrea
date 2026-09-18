export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedMediaFeed } from '@/lib/cache/media.cache';
import { handleRouteError } from '@/lib/api-guards';

// ==========================================
// 📺 GET : Flux des médias (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const feed = await getCachedMediaFeed();
    const visuals = feed?.visuals || [];
    const tracks = feed?.tracks || [];
    
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

  } catch (error: unknown) {
    return handleRouteError(error, 'MEDIA STREAM FEED GET ERROR');
  }
});
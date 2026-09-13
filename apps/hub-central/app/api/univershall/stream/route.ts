// app/api/univershall/stream/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { getCachedUniversHallStream } from '@/lib/cache/univershall.cache';

// -------------------------------------------------------------------------
// GET : Le Flux Transversal de la Canopée (Stream Agrégé)
// -------------------------------------------------------------------------
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const streamItems = await getCachedUniversHallStream();

    // Optionnel : un léger brassage déterministe ou dynamique pour la diversité du flux
    const shuffledStream = [...streamItems].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      success: true,
      data: shuffledStream,
      count: shuffledStream.length
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL STREAM GET ERROR] :", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur interne lors du tissage du flux transversal." 
    }, { status: 500 });
  }
});
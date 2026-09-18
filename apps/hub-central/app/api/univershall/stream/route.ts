export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedUniversHallStream } from '@/lib/cache/univershall.cache';

// -------------------------------------------------------------------------
// GET : Le Flux Transversal de la Canopée (Stream Agrégé)
// -------------------------------------------------------------------------
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const streamItems = await getCachedUniversHallStream();
    const safeItems = Array.isArray(streamItems) ? streamItems : [];

    // Brassage uniquement si le flux possède plusieurs éléments
    const shuffledStream = safeItems.length > 1 
      ? [...safeItems].sort(() => Math.random() - 0.5) 
      : [...safeItems];

    return NextResponse.json({
      success: true,
      data: shuffledStream,
      count: shuffledStream.length
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "UNIVERSHALL STREAM GET FATAL ERROR");
  }
});
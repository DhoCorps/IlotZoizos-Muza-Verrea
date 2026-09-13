// app/api/univershall/constellation/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { withSilice, ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// GET : La Constellation des Tags Croisés (Recherche sémantique transversale)
// -------------------------------------------------------------------------
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const tag = url.searchParams.get('tag');

    if (!tag) {
      return NextResponse.json({ 
        success: false, 
        error: "Un paramètre 'tag' est requis pour explorer la constellation." 
      }, { status: 400 });
    }

    const cleanTag = tag.trim().toLowerCase();

    // Recherche simultanée dans les balises d'Univers'Hall partageant ce tag
    const matchingBeacons = await UniversHallBeaconModel.find({
      tags: { $regex: new RegExp(`^${cleanTag}$`, 'i') }
    })
      .sort({ resonanceScore: -1, createdAt: -1 })
      .limit(40)
      .lean();

    const safeBeacons = JSON.parse(JSON.stringify(matchingBeacons || []));

    // Regroupement par module source pour cartographier la constellation
    const constellationMap: Record<string, any[]> = {};
    safeBeacons.forEach((beacon: any) => {
      const mod = beacon.sourceModule || 'GENERAL';
      if (!constellationMap[mod]) {
        constellationMap[mod] = [];
      }
      constellationMap[mod].push(beacon);
    });

    return NextResponse.json({
      success: true,
      tag: cleanTag,
      totalMatches: safeBeacons.length,
      constellation: constellationMap,
      data: safeBeacons
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [UNIVERS'HALL CONSTELLATION ERROR] :", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur interne lors de l'exploration de la constellation." 
    }, { status: 500 });
  }
});
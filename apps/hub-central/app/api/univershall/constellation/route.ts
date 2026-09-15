// app/api/univershall/constellation/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { withSilice, ApiContext } from '@/lib/api-guards';
import { IlotError } from '@ilot/shared-core';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour limiter la longueur et prévenir les attaques par ReDoS
const TagQuerySchema = z.object({
  tag: z.string()
    .min(1, "Un paramètre 'tag' est requis pour explorer la constellation.")
    .max(50, "Le tag est trop long (Max 50 caractères)."),
});

// -------------------------------------------------------------------------
// GET : La Constellation des Tags Croisés (Recherche sémantique transversale)
// -------------------------------------------------------------------------
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const rawTag = url.searchParams.get('tag');

    // Intercepte proprement l'absence du paramètre pour renvoyer le message exact attendu
    if (!rawTag) {
      return NextResponse.json({ 
        success: false, 
        error: "Un paramètre 'tag' est requis pour explorer la constellation." 
      }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod (notamment pour la limite de taille anti-ReDoS)
    const validation = TagQuerySchema.safeParse({ tag: rawTag });
    if (!validation.success) {
      const errorMessage = validation.error.issues[0]?.message || "Paramètre 'tag' invalide.";
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const cleanTag = validation.data.tag.trim().toLowerCase();

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
    const status = error instanceof IlotError ? error.status : 500;
    const message = error instanceof IlotError ? error.message : "Erreur interne lors de l'exploration de la constellation.";
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status });
  }
});
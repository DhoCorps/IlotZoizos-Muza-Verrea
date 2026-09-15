// Fichier : app/api/showcase/stream/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UniversalMediaType } from '@ilot/types';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedStream } from '@/lib/cache/showcase.cache';

// ==========================================
// 🌌 GET : Générer le Flux du Diaporama (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid; 

    // Extraction et CASTING des filtres granulaires depuis l'URL
    const appsParam = searchParams.get('apps');
    const selectedApps = appsParam ? (appsParam.split(',') as UniversalMediaType[]) : [];
    const onlyTradable = searchParams.get('onlyTradable') === 'true';

    const filters = {
      selectedApps,
      onlyTradable
    };

    // 🎬 Tissage du flux personnalisé mis en cache
    const playlist = await getCachedStream(userUid, filters);

    return NextResponse.json({
      success: true,
      data: playlist,
      count: playlist.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [SHOWCASE STREAM ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne lors du tissage du flux." }, { status });
  }
});
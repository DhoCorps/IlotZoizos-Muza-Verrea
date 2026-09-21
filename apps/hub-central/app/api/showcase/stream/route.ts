export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SourceApp } from '@ilot/types';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedStream } from '@/lib/cache/showcase.cache';
import { z } from 'zod';

// ==========================================
// 🌌 GET : Générer le Flux du Diaporama (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }
    
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid; 

    // Extraction des filtres depuis l'URL
    const appsParam = url.searchParams.get('apps');
    const rawApps = appsParam ? appsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const onlyTradable = url.searchParams.get('onlyTradable') === 'true';

    // Validation optionnelle ou typage des apps via Zod si nécessaire
    const selectedApps = rawApps as SourceApp[];

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

  } catch (error: unknown) {
    return handleRouteError(error, 'SHOWCASE STREAM ERROR');
  }
});
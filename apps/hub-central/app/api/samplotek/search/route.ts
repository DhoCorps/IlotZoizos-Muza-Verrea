export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SampleModel } from '@ilot/infrastructure';
import { withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';

// ==========================================
// 🔎 GET : Explorer l'Audiothèque (Pagination & Modération)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const style = url.searchParams.get('style');
    const musicalKey = url.searchParams.get('musicalKey');
    const minBpm = url.searchParams.get('minBpm');
    const maxBpm = url.searchParams.get('maxBpm');
    const authorUid = url.searchParams.get('authorUid');
    
    // ⚙️ Pagination performante
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (style && style !== 'ALL') query.style = style;
    if (musicalKey && musicalKey !== 'ALL') query.musicalKey = musicalKey;
    if (authorUid) query.authorUid = authorUid;
    if (minBpm || maxBpm) {
      query.tempoBpm = {};
      if (minBpm) (query.tempoBpm as any).$gte = Number(minBpm);
      if (maxBpm) (query.tempoBpm as any).$lte = Number(maxBpm);
    }

    const isRequestingOwnStudio = currentUser && currentUser.uid === authorUid;
    
    // 🛡️ Modération : Seul l'auteur voit ses brouillons et quarantaines
    if (!isRequestingOwnStudio) {
      query.status = 'PUBLISHED';
      query['moderation.isQuarantined'] = false; // Le grand public ne voit pas les fichiers signalés
    }

    let samples;
    let total;

    // ⚡ Optimisation Cache si pas de recherche complexe
    if (!isRequestingOwnStudio && !authorUid && !style && !musicalKey && !minBpm) {
      const catalog = await getCachedSamples();
      samples = catalog.slice(skip, skip + limit);
      total = catalog.length;
    } else {
      [samples, total] = await Promise.all([
        SampleModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        SampleModel.countDocuments(query)
      ]);
    }

    return NextResponse.json({ 
      success: true, 
      data: samples,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'SAMPLE SEARCH ERROR');
  }
});
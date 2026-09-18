import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/media/stream-feed/route';
import { ProductModel } from '@ilot/infrastructure';
import { getCachedMediaFeed } from '@/lib/cache/media.cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context);
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

// 🎯 Mock explicite du cache media pour s'aligner sur la route moderne
vi.mock('@/lib/cache/media.cache', () => ({
  getCachedMediaFeed: vi.fn(),
}));

// 🛡️ MOCK MONGOOSE SÉQUENTIEL PLEINEMENT CONTRÔLÉ
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    find: vi.fn(),
  },
}));

describe('API Media Stream Feed - Flux Public Agora', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 doit récupérer le flux des visuels et des pistes avec succès (200)', async () => {
    vi.mocked(getCachedMediaFeed).mockResolvedValueOnce({
      visuals: [{ uid: 'vis_1', category: 'VIDEO' }],
      tracks: [{ uid: 'trk_1', category: 'MUSIC' }]
    } as unknown as Awaited<ReturnType<typeof getCachedMediaFeed>>);

    const req = new NextRequest('http://localhost/api/media/stream/feed');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.visuals).toHaveLength(1);
    expect(json.data.tracks).toHaveLength(1);
    expect(json.data.visuals[0].uid).toBe('vis_1');
    expect(json.data.tracks[0].uid).toBe('trk_1');
    expect(getCachedMediaFeed).toHaveBeenCalled();
  });
});
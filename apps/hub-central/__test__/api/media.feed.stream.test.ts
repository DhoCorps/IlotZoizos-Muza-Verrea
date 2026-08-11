import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/media/stream-feed/route';
import { ProductModel } from '@ilot/infrastructure';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context);
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
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
    delete (global as any).__mockUser;
  });

  it('🟢 doit récupérer le flux des visuels et des pistes avec succès (200)', async () => {
    // Premier appel (visuals)
    const mockLeanVisuals = vi.fn().mockResolvedValueOnce([{ uid: 'vis_1', category: 'VIDEO' }]);
    const mockLimitVisuals = vi.fn().mockReturnValueOnce({ lean: mockLeanVisuals });

    // Second appel (tracks)
    const mockLeanTracks = vi.fn().mockResolvedValueOnce([{ uid: 'trk_1', category: 'MUSIC' }]);
    const mockLimitTracks = vi.fn().mockReturnValueOnce({ lean: mockLeanTracks });

    vi.mocked(ProductModel.find)
      .mockReturnValueOnce({ limit: mockLimitVisuals } as any)
      .mockReturnValueOnce({ limit: mockLimitTracks } as any);

    const req = new Request('http://localhost/api/media/stream/feed');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.visuals).toHaveLength(1);
    expect(json.data.tracks).toHaveLength(1);
    expect(json.data.visuals[0].uid).toBe('vis_1');
    expect(json.data.tracks[0].uid).toBe('trk_1');
    expect(ProductModel.find).toHaveBeenCalledTimes(2);
  });
});
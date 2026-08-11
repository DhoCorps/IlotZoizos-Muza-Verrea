import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/awards/route';
import { CanopyAwardModel } from '@ilot/infrastructure';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  CanopyAwardModel: {
    find: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('GET /api/canopy/awards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit retourner la liste des trophées de la canopée avec succès (200)', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        { awardKey: 'MOST_ACTIVE_BIRD', title: "La Plume d'Or", yearMonth: '2026-08' }
      ])
    };

    vi.mocked(CanopyAwardModel.find).mockReturnValue(mockQuery as any);

    const req = new Request('http://localhost/api/canopy/awards?yearMonth=2026-08');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.awards).toHaveLength(1);
    expect(json.awards[0].awardKey).toBe('MOST_ACTIVE_BIRD');
  });
});
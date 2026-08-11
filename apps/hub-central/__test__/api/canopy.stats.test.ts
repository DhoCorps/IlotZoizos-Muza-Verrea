import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/stats/route';
import { MessageModel } from '@ilot/infrastructure';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  MessageModel: {
    findOne: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('GET /api/canopy/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit retourner les statistiques de la dernière diffusion', async () => {
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        metadata: {
          statsSnapshot: {
            yearMonth: '2026-08',
            macroTotals: { test: 100 },
            topSellers: [],
            topBuyers: [],
            mostCommented: [],
            mostReactive: []
          }
        }
      })
    };

    vi.mocked(MessageModel.findOne).mockReturnValue(mockQuery as any);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.yearMonth).toBe('2026-08');
  });
});
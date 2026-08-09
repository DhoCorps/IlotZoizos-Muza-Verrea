import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/canopy/stats/route';
import { MessageModel } from '@ilot/infrastructure';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    MessageModel: {
      findOne: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn(),
    }
  };
});

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('GET /api/canopy/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit retourner les statistiques de la dernière diffusion', async () => {
    const mockSnapshot = {
      createdAt: '2026-08-01T00:00:00.000Z',
      metadata: { statsSnapshot: { yearMonth: '2026-08', macroTotals: 100 } }
    };
    
    vi.mocked(MessageModel.findOne().sort().lean).mockResolvedValue(mockSnapshot as any);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.yearMonth).toBe('2026-08');
  });
});
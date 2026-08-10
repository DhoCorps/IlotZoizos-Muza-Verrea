import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/canopy/stats/route';
import { MessageModel } from '@ilot/infrastructure';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  MessageModel: {
    findOne: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  }
}));

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
    
    // On configure le chaînage Mongoose proprement
    vi.mocked(MessageModel.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockSnapshot),
      }),
    } as any);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.yearMonth).toBe('2026-08');
  });
});
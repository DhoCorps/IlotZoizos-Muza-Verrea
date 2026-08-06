// apps/hub-central/__test__/api/leaderboard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/games/leaderboard/route';
import { GameResultModel } from '@ilot/infrastructure';

// 1. On isole le mock de la méthode find et sa chaîne Mongoose
const { mockLean, mockLimit, mockSort, mockFind } = vi.hoisted(() => {
  const mockLean = vi.fn().mockResolvedValue([{ username: 'Oiseau', score: 10 }]);
  const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
  const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFind = vi.fn().mockReturnValue({ sort: mockSort });
  return { mockLean, mockLimit, mockSort, mockFind };
});

// 2. On intercepte le package partagé
vi.mock('@ilot/infrastructure', () => ({
  GameResultModel: {
    find: mockFind,
  },
}));

describe('GET /api/games/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner les scores', async () => {
    const req = new Request('http://test');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.scores).toHaveLength(1);
    expect(mockFind).toHaveBeenCalled();
  });
});
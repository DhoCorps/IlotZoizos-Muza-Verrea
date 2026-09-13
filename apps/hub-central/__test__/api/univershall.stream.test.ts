// apps/hub-central/__test__/api/univershall.stream.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/univershall/stream/route';
import { UniversalMediaModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  UniversalMediaModel: {
    find: vi.fn(),
  },
}));

vi.mock('@lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('API Route /api/univershall/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit récupérer et retourner le flux transversal de la canopée avec succès', async () => {
    vi.mocked(UniversalMediaModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          mediaId: 'art_1',
          sourceApp: 'POETRIK',
          ownerUid: 'bird_1',
          ownerSlug: 'poete-1',
          title: 'Ode au Vent',
          mediaUrl: 'cdn://poeme.txt',
          consentForShowcase: true,
          createdAt: new Date()
        }
      ])
    } as any);

    const req = new Request('http://localhost/api/univershall/stream');
    const res = await GET(req as any, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('Ode au Vent');
    expect(json.data[0].sourceApp).toBe('POETRIK');
  });
});
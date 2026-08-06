import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/media/stream-feed/route';

const mockFind = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    find: (...args: any[]) => ({
      limit: () => ({
        lean: () => mockFind(...args)
      })
    })
  }
}));

describe('API Media - Stream Feed de l’Agora (GET /api/media/stream-feed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit retourner les visuels et pistes audio mélangés', async () => {
    mockFind
      .mockResolvedValueOnce([{ _id: 'v1', title: 'Police Font', category: 'FONT_SPRITE' }])
      .mockResolvedValueOnce([{ _id: 't1', title: 'Partition Jazz', category: 'MUSIC' }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.visuals.length).toBe(1);
    expect(data.data.tracks.length).toBe(1);
    expect(data.data.visuals[0].title).toBe('Police Font');
    expect(data.data.tracks[0].title).toBe('Partition Jazz');
  });

  it('🔥 doit gérer une fracture de la base de données avec élégance (500)', async () => {
    vi.mocked(mockFind).mockRejectedValueOnce(new Error('Erreur de la Silice'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
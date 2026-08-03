// apps/hub-central/__test__/api/media.stream-feed.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/media/stream-feed/route';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    // 🪡 Simulation du chaînage Mongoose .find().limit().lean() avec distinction visuels / pistes audio
    find: vi.fn().mockImplementation((query) => ({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(
          query.category.$in.includes('MUSIC') 
            ? [
                { uid: 'track_1', title: 'Symphonie des Abysses', category: 'MUSIC', author: 'Albatros' }
              ]
            : [
                { uid: 'vis_1', title: 'Fresque Stellaire', category: 'GRAPHIC', author: 'KâÔdz' }
              ]
        )
      })
    }))
  }
}));

describe('📻 API Flux Média Agora (/api/media/stream-feed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit récupérer et renvoyer le flux combiné de visuels et de pistes audio avec succès', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    
    // Vérification des tableaux de visuels et de pistes
    expect(Array.isArray(data.data.visuals)).toBe(true);
    expect(Array.isArray(data.data.tracks)).toBe(true);

    expect(data.data.visuals[0].title).toBe('Fresque Stellaire');
    expect(data.data.tracks[0].title).toBe('Symphonie des Abysses');
  });
});
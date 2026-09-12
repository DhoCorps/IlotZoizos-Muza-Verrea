// Fichier : apps/hub-central/__test__/api/samplotek.search.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/samplotek/search/route';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';

// 🛠️ Correction ici : AJOUTER le slash après le @
vi.mock('@/lib/cache/samplotek.cache', () => ({
  getCachedSamples: vi.fn(),
}));

// Mock des gardes d'API pour laisser passer le middleware Silice
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('Route API : SamploTek Search (GET)', () => {
  const mockSamples = [
    {
      uid: 'samp_1',
      title: 'Ambient Beats',
      slug: 'ambient-beats',
      audioUrl: 'https://r2.url/1.mp3',
      tempoBpm: 120,
      musicalKey: 'C major',
      style: 'Ambient',
      creatorUid: 'user_1',
      permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: true }
    },
    {
      uid: 'samp_2',
      title: 'Heavy Groove',
      slug: 'heavy-groove',
      audioUrl: 'https://r2.url/2.mp3',
      tempoBpm: 90,
      musicalKey: 'A minor',
      style: 'Funk',
      creatorUid: 'user_2',
      permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: true }
    },
    {
      uid: 'samp_3',
      title: 'Fast Cyber',
      slug: 'fast-cyber',
      audioUrl: 'https://r2.url/3.mp3',
      tempoBpm: 140,
      musicalKey: 'G major',
      style: 'Ambient',
      creatorUid: 'user_1',
      permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: true }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getCachedSamples as any).mockResolvedValue(mockSamples);
  });

  it('doit renvoyer tous les samples sans filtres (200)', async () => {
    const req = new Request('http://localhost:3000/api/samplotek/search');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(3);
  });

  it('doit filtrer correctement les samples par style', async () => {
    const req = new Request('http://localhost:3000/api/samplotek/search?style=Ambient');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data.every((s: any) => s.style.toLowerCase() === 'ambient')).toBe(true);
  });

  it('doit filtrer correctement par plage de BPM (minBpm et maxBpm)', async () => {
    const req = new Request('http://localhost:3000/api/samplotek/search?minBpm=100&maxBpm=130');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('Ambient Beats');
  });

  it('doit gérer les erreurs internes proprement (500)', async () => {
    (getCachedSamples as any).mockRejectedValueOnce(new Error('Erreur de la base Silice'));

    const req = new Request('http://localhost:3000/api/samplotek/search');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Erreur de la base Silice');
  });
});
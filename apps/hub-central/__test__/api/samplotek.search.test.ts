import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/samplotek/search/route';
import { getCachedSamples } from '@/lib/cache/samplotek.cache';
import { NextRequest } from 'next/server';

vi.mock('@/lib/cache/samplotek.cache', () => ({ getCachedSamples: vi.fn() }));
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => handler(req, context)
}));

describe('API SamploTek - Search (GET)', () => {
  beforeEach(() => {
      vi.clearAllMocks();
  });

  it('🟢 doit filtrer les samples par style et BPM depuis le cache', async () => {
    vi.mocked(getCachedSamples).mockResolvedValue([
      { uid: '1', tempoBpm: 120, style: 'Techno', musicalKey: 'A' },
      { uid: '2', tempoBpm: 90, style: 'LoFi', musicalKey: 'C' }
    ] as any);

    const req = new NextRequest('http://localhost/api/samplotek/search?style=Techno&minBpm=100');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].style).toBe('Techno');
  });
});
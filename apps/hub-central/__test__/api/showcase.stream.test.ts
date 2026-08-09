import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/showcase/stream/route';
import { ShowcaseOrchestrator } from '@ilot/shared-core';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ShowcaseOrchestrator: {
      getPersonalizedShowcase: vi.fn(),
    }
  };
});

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
  },
}));

describe('GET /api/showcase/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit générer un flux personnalisé pour l\'utilisateur authentifié', async () => {
    const mockPlaylist = [{ mediaId: 'media_1', title: 'Art' }];
    vi.mocked(ShowcaseOrchestrator.getPersonalizedShowcase).mockResolvedValue(mockPlaylist as any);

    const req = new Request('http://localhost/api/showcase/stream?apps=DHO,GALLERY&onlyTradable=true');
    const res = await GET(req, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(ShowcaseOrchestrator.getPersonalizedShowcase).toHaveBeenCalledWith(
      'bird_test_123',
      { selectedApps: ['DHO', 'GALLERY'], onlyTradable: true }
    );
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/awards/route';
import { getCachedAwards } from '@/lib/cache/canopy.cache';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------

// 🛡️ On mocke directement le module de cache pour isoler la route de Mongoose
vi.mock('@/lib/cache/canopy.cache', () => ({
  getCachedAwards: vi.fn()
}));

// Mock du guard withSilice (bypasse la connexion DB pour le test unitaire)
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
  };
});

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : GET /api/canopy/awards', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner la liste des trophées de la canopée avec succès (200)', async () => {
    // 🌿 Simulation d'un retour sain du cache
    vi.mocked(getCachedAwards).mockResolvedValue([
      { awardKey: 'MOST_ACTIVE_BIRD', title: "La Plume d'Or", yearMonth: '2026-08' }
    ] as any);

    const req = new Request('http://localhost/api/canopy/awards?yearMonth=2026-08');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.awards).toHaveLength(1);
    expect(json.awards[0].awardKey).toBe('MOST_ACTIVE_BIRD');
    
    // Vérifie que le paramètre d'URL a bien été transmis au cache
    expect(getCachedAwards).toHaveBeenCalledWith('2026-08');
  });

  it('🟢 doit transmettre "undefined" au cache si le paramètre yearMonth est absent', async () => {
    vi.mocked(getCachedAwards).mockResolvedValue([]);

    const req = new Request('http://localhost/api/canopy/awards');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.awards).toEqual([]);
    
    // Vérifie la robustesse de l'extraction de paramètre
    expect(getCachedAwards).toHaveBeenCalledWith(undefined);
  });

  it('🔴 doit retourner une erreur structurée au format unifié en cas d\'échec interne', async () => {
    // 💥 Simulation d'une erreur critique du cache ou de la base
    vi.mocked(getCachedAwards).mockRejectedValue(new Error('Erreur base de données'));

    const req = new Request('http://localhost/api/canopy/awards');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });
});
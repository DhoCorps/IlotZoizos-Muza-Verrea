import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/stats/route';
import { getCachedCanopyStats } from '@/lib/cache/canopy.cache';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------

// 🛡️ On mocke directement le module de cache pour isoler la route de Mongoose
vi.mock('@/lib/cache/canopy.cache', () => ({
  getCachedCanopyStats: vi.fn()
}));

// Mock du guard withSilice (permet de bypasser la connexion DB pour le test unitaire pur)
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
describe('Route API : GET /api/canopy/stats', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner les statistiques de la dernière diffusion (200)', async () => {
    // 🌿 Simulation d'un retour sain du cache de la Canopée
    vi.mocked(getCachedCanopyStats).mockResolvedValue({
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      metadata: {
        statsSnapshot: {
          yearMonth: '2026-08',
          macroTotals: { transactionCount: 42, totalVolumeCents: 50000 },
          topSellers: [{ _id: 'bird_1', totalVolumeCents: 10000 }],
          topBuyers: [],
          mostCommented: [],
          mostReactive: []
        }
      }
    } as any);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.yearMonth).toBe('2026-08');
    expect(json.macroTotals.transactionCount).toBe(42);
    expect(json.topSellers[0]._id).toBe('bird_1');
  });

  it('🔴 doit retourner une erreur (404) si aucune stat n\'est disponible', async () => {
    // 🌿 Simulation d'un cache vide ou d'un cycle non clôturé
    vi.mocked(getCachedCanopyStats).mockResolvedValue(null);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Aucun bilan de la canopée disponible pour le moment.");
  });

  it('🔴 doit retourner une erreur (404) si le format des stats est invalide', async () => {
    // 🌿 Simulation d'un document corrompu (sans metadata)
    vi.mocked(getCachedCanopyStats).mockResolvedValue({
      createdAt: new Date(),
      metadata: {} // statsSnapshot manquant
    } as any);

    const req = new Request('http://localhost/api/canopy/stats');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
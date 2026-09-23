import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/demopraxy/register/route';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ORCHESTRATEUR
// -------------------------------------------------------------------------
vi.mock('@ilot/shared-core', () => ({
  DemopraxyOrchestrator: class {
    getDemopraxicRegister = vi.fn().mockResolvedValue({
      success: true,
      data: [{ uid: 'demo_1', sanctionCategory: 'TOXICITY', tags: ['spam'] }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
    });
  }
}));

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

describe('API Demopraxy Register GET', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner la liste paginée du registre démopraxique avec succès (200)', async () => {
    const req = new Request('http://localhost/api/demopraxy/register?page=1&limit=10&sanctionCategory=TOXICITY&tag=spam&isExcluded=true');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it('🟢 doit gérer l\'absence de paramètres de recherche avec des valeurs par défaut robustes', async () => {
    const req = new Request('http://localhost/api/demopraxy/register');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});
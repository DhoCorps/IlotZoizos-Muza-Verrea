import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/vote/route';
import { executeCachedVote } from '@/lib/cache/canopy.cache';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DU CACHE
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn()
}));

vi.mock('@/lib/cache/canopy.cache', () => ({
  executeCachedVote: vi.fn().mockResolvedValue(undefined),
}));

// Mock du guard withAura
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: Request, context: ApiContext) => {
      const currentUser = global.__mockUser;
      
      if (!currentUser || !currentUser.uid) {
        return new Response(JSON.stringify({ success: false, error: "Oiseau non identifié" }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // @ts-ignore
      return await handler(req, context, currentUser);
    },
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('API Route - /api/canopy/subsidy/vote (avec Cache & Orchestrateur)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = { uid: 'bird_voter_123', capabilities: [] };
  });

  it('🟢 doit enregistrer un vote avec succès en mode POST (200) via le cache de la Canopée', async () => {
    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    expect(executeCachedVote).toHaveBeenCalledWith('sub_test_1', 'bird_voter_123');
  });

  it('🔴 doit rejeter la requête (400) si l\'ID de subvention est manquant', async () => {
    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("ID de subvention requis pour voter.");
    expect(executeCachedVote).not.toHaveBeenCalled();
  });

  it('🔴 doit rejeter la requête (401) si l\'oiseau n\'est pas identifié', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Oiseau non identifié");
    expect(executeCachedVote).not.toHaveBeenCalled();
  });
});
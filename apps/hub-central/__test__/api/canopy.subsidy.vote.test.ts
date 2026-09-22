import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/vote/route';
import { NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn()
}));

// 🛡️ Mock de l'Orchestrateur avec une vraie classe ES6 pour supporter "new"
const mockCastVote = vi.fn().mockResolvedValue(undefined);

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    CanopySubsidyOrchestrator: class {
      castVote = mockCastVote;
    },
    IlotError: class extends Error {
      status: number;
      constructor(message: string, code: string, status: number) {
        super(message);
        this.status = status;
      }
    }
  };
});

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
describe('API Route - /api/canopy/subsidy/vote (avec Délégation Orchestrateur)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = { uid: 'bird_voter_123', capabilities: [] };
  });

  it('🟢 doit enregistrer un vote avec succès en mode POST (200) via l\'orchestrateur', async () => {
    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    expect(mockCastVote).toHaveBeenCalledWith('sub_test_1', {
      actorUid: 'bird_voter_123',
      capabilities: []
    });
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
  });
});
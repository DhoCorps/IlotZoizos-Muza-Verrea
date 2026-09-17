import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/vote/route';
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';
import { NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn()
}));

vi.mock('@ilot/shared-core', () => ({
  CanopySubsidyOrchestrator: {
    voteForSubsidy: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: Request, context: ApiContext) => {
      // 🛡️ Correction : on vérifie si l'utilisateur est défini et possède un uid
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

describe('API Route - /api/canopy/subsidy/vote (avec Cache Sécurisé)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    // 🛡️ Par défaut, un utilisateur valide pour les tests qui en ont besoin
    global.__mockUser = { uid: 'bird_voter_123', capabilities: [] };
  });

  it('🟢 doit enregistrer un vote avec succès en mode POST (200)', async () => {
    vi.mocked(CanopySubsidyOrchestrator.voteForSubsidy).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
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
    // 🛡️ Simulation explicite d'un utilisateur non connecté
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
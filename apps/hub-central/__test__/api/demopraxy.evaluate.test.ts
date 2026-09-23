import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/demopraxy/evaluate/route';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: Request, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié" }, { status: 401 });
      }
      return await (handler as any)(req, ctx, mockUser);
    },
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

describe('API Demopraxy Evaluation POST', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(DemopraxyOrchestrator.prototype, 'processDemopraxicEvaluation').mockResolvedValue({
      success: true,
      isExcluded: false,
      exScore: 2.5,
      actionMessage: 'Flux sous le seuil critique',
      targetUid: 'bird_2',
      targetSlug: 'bird-2',
      sanctionCategory: 'SYSTEMIC_HATRED',
      tags: [],
      user: {}
    });
  });

  it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new Request('http://localhost/api/demopraxy/evaluate', {
      method: 'POST',
      body: JSON.stringify({ 
        userIdentifier: 'bird_2', 
        metrics: { systemicHatredScore: 1, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 5 } 
      })
    });

    const res = await postHandler(req, {} as ApiContext);
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si des paramètres requis sont manquants', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['*'] };

    const req = new Request('http://localhost/api/demopraxy/evaluate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_2' }) // metrics omis
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  it('🟢 doit traiter l\'évaluation démopraxique avec succès (200), catégorie et tags, et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['*'] };

    const req = new Request('http://localhost/api/demopraxy/evaluate', {
      method: 'POST',
      body: JSON.stringify({ 
        userIdentifier: 'bird_2', 
        sanctionCategory: 'TOXICITY',
        tags: ['spam', 'avertissement'],
        metrics: { 
          systemicHatredScore: 2, 
          recurrenceCount: 1, 
          recalibrationCapacity: 8, 
          collectiveResonance: 9 
        } 
      })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy');
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy-bird_2');
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy-actor-bird_1');
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/demopraxy/evaluate/route';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: any;
}

describe('API Demopraxy Evaluation POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de DemopraxyOrchestrator
    vi.spyOn(DemopraxyOrchestrator.prototype, 'processDemopraxicEvaluation').mockResolvedValue({
      success: true,
      score: 85,
    } as any);
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/demopraxy', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1', metrics: { noiseLevel: 10 } })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si des paramètres requis sont manquants', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new Request('http://localhost/api/demopraxy', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1' }) // metrics omis
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('manquants');
  });

  it('🟢 [POST] doit traiter l\'évaluation démopraxique avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['ADMIN'] };

    const req = new Request('http://localhost/api/demopraxy', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_2', metrics: { noiseLevel: 5 } })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.score).toBe(85);
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy');
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy-bird_2');
    expect(revalidateTag).toHaveBeenCalledWith('demopraxy-actor-bird_1');
  });
});
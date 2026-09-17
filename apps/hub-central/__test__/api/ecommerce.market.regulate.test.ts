import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/market/regulate/route';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié" }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Market Regulation POST', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de MarketRegulationOrchestrator
    vi.spyOn(MarketRegulationOrchestrator.prototype, 'processConnectedRegulation').mockResolvedValue({
      success: true,
      adjustedValue: 42,
    } as unknown as Awaited<ReturnType<MarketRegulationOrchestrator['processConnectedRegulation']>>);
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10 })
    });

    const res = await postHandler(req, {} as ApiContext);
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si des paramètres requis sont manquants', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1' }) // takeValue omis
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain('invalides');
  });

  it('🟢 [POST] doit traiter la régulation avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['ADMIN'] };

    const req = new NextRequest('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10, currentNeeds: 5, creationFactor: 1.2 })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; adjustedValue: number };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.adjustedValue).toBe(42);
    expect(revalidateTag).toHaveBeenCalledWith('marketplace');
    expect(revalidateTag).toHaveBeenCalledWith('market-regulation');
  });
});
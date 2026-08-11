import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/market/regulate/route';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
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

describe('API Market Regulation POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de MarketRegulationOrchestrator
    vi.spyOn(MarketRegulationOrchestrator.prototype, 'processConnectedRegulation').mockResolvedValue({
      success: true,
      adjustedValue: 42,
    } as any);
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10 })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si des paramètres requis sont manquants', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new Request('http://localhost/api/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1' }) // takeValue omis
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('manquants');
  });

  it('🟢 [POST] doit traiter la régulation avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['ADMIN'] };

    const req = new Request('http://localhost/api/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10, currentNeeds: 5, creationFactor: 1.2 })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.adjustedValue).toBe(42);
    expect(revalidateTag).toHaveBeenCalledWith('marketplace');
    expect(revalidateTag).toHaveBeenCalledWith('market-regulation');
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/market/regulate/route';
import { MarketRegulationOrchestrator } from '@ilot/shared-core';
import { NextResponse } from 'next/server';

// 1. Mock de l'API Guard
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, ctx: any) => {
    // Si global.__mockUser est undefined, on simule l'absence d'authentification
    const user = global.__mockUser || null;
    return await handler(req, ctx, user);
  },
}));

// Mock des dépendances Next
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

describe('API Market Regulation - Régulation de l’Îlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('❌ doit rejeter les requêtes non authentifiées (401)', async () => {
    global.__mockUser = null; // Simule un utilisateur non authentifié

    const req = new Request('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'bird-test', takeValue: 5 })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Oiseau non identifié");
  });

  it('🟢 doit traiter la régulation avec succès (200) pour un utilisateur authentifié', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: ['*'] };
    
    // Espionne l'orchestrateur pour éviter un appel réel à la base
    vi.spyOn(MarketRegulationOrchestrator.prototype, 'processConnectedRegulation')
      .mockResolvedValue({ success: true, targetUid: 'bird_1' } as any);

    const req = new Request('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10 })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
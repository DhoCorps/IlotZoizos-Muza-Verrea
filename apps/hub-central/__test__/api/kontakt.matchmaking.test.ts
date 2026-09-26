import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/matchmaking/route';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: vi.fn((err) => {
    console.error("🔥 [ROUTE ERROR MOCKED CATCH] :", err);
    return NextResponse.json({ success: false, error: "Erreur Interne" }, { status: 500 });
  })
}));

// 🛠️ MOCK TOTAL DE LA CLASSE VIA UN CONSTRUCTEUR EXPLICITE
vi.mock('@ilot/shared-core', () => {
  class MockOrchestrator {
    matchmakingEngine = vi.fn().mockResolvedValue({
      isFavorable: true,
      matchFlag: 'FAVORABLE_MATCH',
      compatibilityScore: 95
    });
    registerSwipe = vi.fn();
  }
  return {
    KontaktOrchestrator: MockOrchestrator,
  };
});

describe('API Kontakt Matchmaking - Évaluation des affinités', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l’oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/matchmaking', {
      method: 'POST',
      body: JSON.stringify({ questMaxBudgetCents: 50000 })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si le payload est corrompu ou mal typé selon Zod', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/matchmaking', {
      method: 'POST',
      body: JSON.stringify({ questMaxBudgetCents: 'pas-un-nombre' }) // Invalide
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Contrat souverain invalide');
  });

  it('🟢 doit évaluer et retourner le score de compatibilité avec succès (200)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/matchmaking', {
      method: 'POST',
      body: JSON.stringify({
        questMaxBudgetCents: 60000,
        profileHourlyRateCents: 45000,
        questWorkArrangement: 'FULL_REMOTE',
        profileRemotePreference: 'FULL_REMOTE',
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.isFavorable).toBe(true);
    expect(json.data.compatibilityScore).toBe(95);
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/games/bet/route';
import { BettingOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// 🛡️ Mocks de l'orchestrateur partagé
vi.mock('@ilot/shared-core', () => ({
  BettingOrchestrator: {
    placeBet: vi.fn()
  }
}));

// Mock du guard withAura respectant dynamiquement l'état de l'utilisateur simulé
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const currentUser = (global as { __mockUser?: { uid: string } | null }).__mockUser !== undefined 
        ? (global as { __mockUser?: { uid: string } | null }).__mockUser 
        : { uid: 'bird_test_123' };
      
      // @ts-ignore
      return await handler(req, context, currentUser);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Route - /api/games/bet (Comptoir de Barter)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as { __mockUser?: unknown }).__mockUser; // Réinitialise l'état par défaut
  });

  it('🔴 doit rejeter la requête avec un statut 401 si l\'oiseau n\'est pas identifié', async () => {
    (global as { __mockUser?: null }).__mockUser = null;

    const req = new NextRequest('http://localhost/api/games/bet', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'g1', bets: [{ type: 'TOX', amount: 10 }], targets: [] })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
  });

  it('🔴 doit rejeter la requête avec un statut 400 si les paramètres gameId, bets ou targets sont invalides', async () => {
    const req = new NextRequest('http://localhost/api/games/bet', {
      method: 'POST',
      body: JSON.stringify({ gameId: '', bets: [], targets: [] })
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain('Paramètres de pari invalides');
  });

  it('🟢 doit exécuter le pari avec succès, renvoyer le résultat et invalider le cache', async () => {
    const mockBetResult = { isWinner: true, results: [{ type: 'TOX', amount: 50 }] };
    vi.mocked(BettingOrchestrator.placeBet).mockResolvedValueOnce(mockBetResult as unknown as Awaited<ReturnType<typeof BettingOrchestrator.placeBet>>);

    const payload = {
      gameId: 'canopy-dice-game',
      bets: [{ type: 'TOX', amount: 10 }],
      targets: [{ type: 'TOX', amount: 50 }]
    };

    const req = new NextRequest('http://localhost/api/games/bet', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const response = await postHandler(req, {} as ApiContext);
    const data = await response.json() as { success: boolean; isWinner: boolean };

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      isWinner: true
    });
    expect(BettingOrchestrator.placeBet).toHaveBeenCalledWith(
      'bird_test_123',
      'canopy-dice-game',
      payload.bets,
      payload.targets
    );
    expect(revalidateTag).toHaveBeenCalledWith('user-wallet');
    expect(revalidateTag).toHaveBeenCalledWith('game-stats');
    expect(revalidateTag).toHaveBeenCalledWith('user-assets');
  });
});
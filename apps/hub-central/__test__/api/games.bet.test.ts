import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/games/bet/route';
import { BettingOrchestrator } from '@ilot/shared-core';

// 🛡️ Mocks de l'orchestrateur partagé
vi.mock('@ilot/shared-core', () => ({
  BettingOrchestrator: {
    placeBet: vi.fn()
  }
}));

// Mock du guard withAura respectant dynamiquement l'état de l'utilisateur simulé
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const currentUser = (global as any).__mockUser !== undefined 
      ? (global as any).__mockUser 
      : { uid: 'bird_test_123' }; // Par défaut connecté dans les autres tests
      
    return handler(req, context, currentUser);
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}));

describe('API Route - /api/games/bet (Comptoir de Barter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser; // Réinitialise l'état par défaut
  });

  it('🔴 doit rejeter la requête avec un statut 401 si l\'oiseau n\'est pas identifié', async () => {
    // Force explicitement l'absence d'utilisateur pour simuler le rejet 401
    (global as any).__mockUser = null;

    const req = new Request('http://localhost/api/games/bet', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'g1', bets: [], targets: [] })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error');
  });

  it('🔴 doit rejeter la requête avec un statut 400 si les paramètres gameId, bets ou targets sont invalides', async () => {
    const req = new Request('http://localhost/api/games/bet', {
      method: 'POST',
      body: JSON.stringify({ gameId: '', bets: [], targets: [] })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Paramètres de pari invalides');
  });

  it('🟢 doit exécuter le pari avec succès et renvoyer le résultat', async () => {
    const mockBetResult = { isWinner: true, results: [{ type: 'TOX', amount: 50 }] };
    vi.mocked(BettingOrchestrator.placeBet).mockResolvedValueOnce(mockBetResult as any);

    const payload = {
      gameId: 'canopy-dice-game',
      bets: [{ type: 'TOX', amount: 10 }],
      targets: [{ type: 'TOX', amount: 50 }]
    };

    const req = new Request('http://localhost/api/games/bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

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
  });
});
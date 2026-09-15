// __test__/api/economy.kontrakt.resolve.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/economy/kontrakt/resolve/route';
import { KonTraKt, EconomyService } from '@ilot/infrastructure';
import { BettingOrchestrator } from '@ilot/shared-core';

// 🛡️ Mocks
vi.mock('@ilot/infrastructure', () => ({
  KonTraKt: { findById: vi.fn() },
  EconomyService: { addResources: vi.fn().mockResolvedValue(true) }
}));

vi.mock('@ilot/shared-core', () => ({
  BettingOrchestrator: { resolveGameAndCalculateCredit: vi.fn() }
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { uid: 'champion_bird', capabilities: [] };
    return handler(req, context, mockUser);
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}));

describe('Route API - Résolution de KonTraKt', () => {
  let mockContractDoc: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🟢 On regénère un contrat vierge avant chaque test
    mockContractDoc = {
      _id: 'contract_123',
      creatorId: 'champion_bird', 
      acceptedById: 'challenger_bird',
      status: 'accepted',
      gameId: 'plajia_1',
      gameMode: 'multiplayer',
      difficulty: 'Artisan',
      wagerCurrency: 'plumes',
      wagerAmount: 10,
      save: vi.fn().mockResolvedValue(true)
    };
  });

  const mockRequest = (body: any) => ({
    json: vi.fn().mockResolvedValue(body)
  } as any);

  it('🔴 doit bloquer si le contrat n\'est pas "accepted"', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce({ ...mockContractDoc, status: 'pending' } as any);

    const response = await POST(mockRequest({ kontraktId: 'contract_123', isWinner: true }), {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('pas en phase de résolution');
  });

  it('🟢 Défaite : doit acter la défaite sans donner de ressources', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as any);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: false, creditEarned: 0 
    } as any);

    const response = await POST(mockRequest({ kontraktId: 'contract_123', isWinner: false }), {} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Banque de la Canopée');
    expect(EconomyService.addResources).not.toHaveBeenCalled();
    expect(mockContractDoc.save).toHaveBeenCalled();
  });

  it('🔴 Fraude : doit bloquer si le Panier coûte plus cher que le crédit gagné', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as any);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: true, creditEarned: 5.0 
    } as any);

    const greedyBasket = [{ currency: 'totamtoes', quantity: 4, unitDhOValue: 1.5 }]; // Coût: 6.0 DhÔ

    const response = await POST(mockRequest({ kontraktId: 'contract_123', isWinner: true, victoryBasket: greedyBasket }), {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Fraude détectée');
    expect(EconomyService.addResources).not.toHaveBeenCalled();
  });

  it('🟢 Victoire : doit livrer les ressources et calculer la fraction brûlée', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as any);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: true, creditEarned: 5.0 
    } as any);

    const perfectBasket = [
      { currency: 'totamtoes', quantity: 2, unitDhOValue: 1.5 }, // 3.0 DhÔ
      { currency: 'plumes', quantity: 1, unitDhOValue: 1.0 }    // 1.0 DhÔ
    ];

    const response = await POST(mockRequest({ kontraktId: 'contract_123', isWinner: true, victoryBasket: perfectBasket }), {} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.creditEarned).toBe(5.0);
    expect(data.data.basketCost).toBe(4.0);
    expect(data.data.burnedFraction).toBe(1.0); // Le mécanisme déflationniste a fonctionné
    
    expect(EconomyService.addResources).toHaveBeenCalledWith('champion_bird', {
      totamtoes: 2,
      plumes: 1
    });
  });
});
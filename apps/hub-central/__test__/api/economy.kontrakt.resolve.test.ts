import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/economy/kontrakt/resolve/route';
import { KonTraKt, EconomyService } from '@ilot/infrastructure';
import { BettingOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('@ilot/infrastructure', () => ({
  KonTraKt: { findById: vi.fn() },
  EconomyService: { addResources: vi.fn().mockResolvedValue(true) }
}));

vi.mock('@ilot/shared-core', () => ({
  BettingOrchestrator: { resolveGameAndCalculateCredit: vi.fn() }
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = { uid: 'champion_bird', capabilities: [] };
      // @ts-ignore
      return await handler(req, context, mockUser);
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

describe('Route API - Résolution de KonTraKt', () => {
  const postHandler = POST as unknown as RouteHandler;
  let mockContractDoc: { [key: string]: unknown; save: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContractDoc = {
      _id: 'contract_123',
      creatorId: 'champion_bird', 
      acceptedById: 'challenger_bird',
      status: 'accepted',
      gameId: 'plajia_1',
      gameMode: 'multiplayer', // 👈 Ajouté ici pour correspondre au contrat
      difficulty: 'Artisan',
      wagerCurrency: 'plumes',
      wagerAmount: 10,
      targetDhOValue: 15,
      expiresAt: new Date(),
      save: vi.fn().mockResolvedValue(true)
    };
  });

  const mockRequest = (body: unknown) => new NextRequest('http://localhost/api/economy/kontrakt/resolve', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  it('🔴 doit bloquer si le contrat n\'est pas "accepted"', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce({ ...mockContractDoc, status: 'pending' } as unknown as Awaited<ReturnType<typeof KonTraKt.findById>>);

    const response = await postHandler(mockRequest({ kontraktId: 'contract_123', isWinner: true }), {} as ApiContext);
    const data = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain('pas en phase de résolution');
  });

  it('🟢 Défaite : doit acter la défaite sans donner de ressources', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as unknown as Awaited<ReturnType<typeof KonTraKt.findById>>);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: false, creditEarned: 0 
    } as unknown as Awaited<ReturnType<typeof BettingOrchestrator.resolveGameAndCalculateCredit>>);

    const response = await postHandler(mockRequest({ kontraktId: 'contract_123', isWinner: false }), {} as ApiContext);
    const data = await response.json() as { success: boolean; message: string };

    expect(response.status).toBe(200);
    expect(data.message).toContain('Banque de la Canopée');
    expect(EconomyService.addResources).not.toHaveBeenCalled();
    expect(mockContractDoc.save).toHaveBeenCalled();
  });

  it('🔴 Fraude : doit bloquer si le Panier coûte plus cher que le crédit gagné', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as unknown as Awaited<ReturnType<typeof KonTraKt.findById>>);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: true, creditEarned: 5.0 
    } as unknown as Awaited<ReturnType<typeof BettingOrchestrator.resolveGameAndCalculateCredit>>);

    const greedyBasket = [{ currency: 'totamtoes', quantity: 4, unitDhOValue: 1.5 }];

    const response = await postHandler(mockRequest({ kontraktId: 'contract_123', isWinner: true, victoryBasket: greedyBasket }), {} as ApiContext);
    const data = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain('Fraude détectée');
    expect(EconomyService.addResources).not.toHaveBeenCalled();
  });

  it('🟢 Victoire : doit livrer les ressources et calculer la fraction brûlée', async () => {
    vi.mocked(KonTraKt.findById).mockResolvedValueOnce(mockContractDoc as unknown as Awaited<ReturnType<typeof KonTraKt.findById>>);
    vi.mocked(BettingOrchestrator.resolveGameAndCalculateCredit).mockResolvedValueOnce({ 
      success: true, isWinner: true, creditEarned: 5.0 
    } as unknown as Awaited<ReturnType<typeof BettingOrchestrator.resolveGameAndCalculateCredit>>);

    const perfectBasket = [
      { currency: 'totamtoes', quantity: 2, unitDhOValue: 1.5 },
      { currency: 'plumes', quantity: 1, unitDhOValue: 1.0 }
    ];

    const response = await postHandler(mockRequest({ kontraktId: 'contract_123', isWinner: true, victoryBasket: perfectBasket }), {} as ApiContext);
    const data = await response.json() as { success: boolean; data: { creditEarned: number; basketCost: number; burnedFraction: number } };

    expect(response.status).toBe(200);
    expect(data.data.creditEarned).toBe(5.0);
    expect(data.data.basketCost).toBe(4.0);
    expect(data.data.burnedFraction).toBe(1.0);
    
    expect(EconomyService.addResources).toHaveBeenCalledWith('champion_bird', {
      totamtoes: 2,
      plumes: 1
    });
  });
});
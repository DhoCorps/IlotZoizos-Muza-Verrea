import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/swipes/route';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: vi.fn((err) => NextResponse.json({ error: "Erreur Interne" }, { status: 500 }))
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  KontaktOrchestrator: vi.fn().mockImplementation(() => ({
    registerSwipe: vi.fn(),
    matchmakingEngine: vi.fn().mockResolvedValue({ isFavorable: true, matchFlag: 'FAVORABLE_MATCH', compatibilityScore: 100 }),
  })),
}));

describe('API Kontakt Swipes - Enregistrement des affinités', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_1', action: 'LIKE' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si les paramètres de swipe sont incomplets', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_1' }) // action manquant
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('incomplets');
  });

  // 🆕 Test : Rejet de matchmaking
  it('🔴 doit rejeter (403) un LIKE si l\'affinité calculée est trop basse (ex: SKILLS_MISMATCH)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockMatchmakingEngine = vi.fn().mockResolvedValueOnce({
      isFavorable: false,
      matchFlag: 'SKILLS_MISMATCH',
      compatibilityScore: 25
    });
    
    const registerSwipeMock = vi.fn();

    vi.mocked(KontaktOrchestrator).mockImplementationOnce(() => ({
      registerSwipe: registerSwipeMock,
      matchmakingEngine: mockMatchmakingEngine,
    } as unknown as KontaktOrchestrator));

    const req = new NextRequest('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ 
        targetUid: 'target_2', 
        action: 'LIKE',
        matchmakingData: {
          questRequiredSkills: ['React', 'Neo4j', 'TypeScript'],
          profileSkills: ['HTML']
        }
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('trop faible');
    expect(json.flag).toBe('SKILLS_MISMATCH');
    expect(registerSwipeMock).not.toHaveBeenCalled(); // Le swipe en base n'a pas eu lieu !
  });

  it('🟢 doit enregistrer le swipe avec succès (200) et invalider le cache si bonne affinité', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockSwipeResult = { matched: true, matchId: 'match_123' };
    const registerSwipeMock = vi.fn().mockResolvedValueOnce(mockSwipeResult);
    
    // Le mock par défaut de matchmakingEngine (Favorable) défini en haut sera utilisé

    vi.mocked(KontaktOrchestrator).mockImplementationOnce(() => ({
      registerSwipe: registerSwipeMock,
      matchmakingEngine: vi.fn().mockResolvedValue({ isFavorable: true, matchFlag: 'FAVORABLE_MATCH', compatibilityScore: 90 })
    } as unknown as KontaktOrchestrator));

    const req = new NextRequest('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ 
        targetUid: 'target_2', 
        action: 'LIKE',
        matchmakingData: {
          questRequiredSkills: ['React'],
          profileSkills: ['React']
        } 
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockSwipeResult);
    expect(registerSwipeMock).toHaveBeenCalledWith(
      { swiperUid: 'bird_1', targetUid: 'target_2', action: 'LIKE' },
      { actorUid: 'bird_1', capabilities: [] }
    );
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-swipes');
    expect(revalidateTag).toHaveBeenCalledWith('matches-bird_1');
    expect(revalidateTag).toHaveBeenCalledWith('matches-target_2');
  });
});
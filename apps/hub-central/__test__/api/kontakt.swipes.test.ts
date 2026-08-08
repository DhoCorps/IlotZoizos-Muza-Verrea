import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/swipes/route';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/shared-core', () => ({
  KontaktOrchestrator: vi.fn().mockImplementation(() => ({
    registerSwipe: vi.fn(),
  })),
}));

declare global {
  var __mockUser: any;
}

describe('API Kontakt Swipes - Enregistrement des affinités', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('doit rejeter (401) si l\'oiseau n\'est pas connecté', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_1', action: 'LIKE' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('doit rejeter (400) si les paramètres de swipe sont incomplets', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new Request('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_1' }) // action manquant
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('incomplets');
  });

  it('doit enregistrer le swipe avec succès (200) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockSwipeResult = { matched: true, matchId: 'match_123' };
    const registerSwipeMock = vi.fn().mockResolvedValueOnce(mockSwipeResult);
    vi.mocked(KontaktOrchestrator).mockImplementationOnce(() => ({
      registerSwipe: registerSwipeMock,
    } as any));

    const req = new Request('http://localhost/api/kontakt/swipes', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_2', action: 'LIKE' })
    });

    const res = await POST(req as any, {});
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
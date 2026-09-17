// Fichier : __test__/api/games.save-result.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/games/save-result/route';
import { GameResultModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = (global as any).__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    GameResultModel: {
      create: vi.fn(),
    },
  };
});

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Games Save Result', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    (global as any).__mockUser = null;

    const req = new NextRequest('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'quiz', score: 100 })
    });

    const res = await postHandler(req, {} as ApiContext);
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si les données de jeu sont incomplètes', async () => {
    (global as any).__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'quiz' }) // score omis
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; error: string };

    expect(res.status).toBe(400);
    expect(json.error).toContain('incomplètes');
  });

  it('🟢 [POST] doit enregistrer le score avec succès (201) et invalider les caches', async () => {
    (global as any).__mockUser = { uid: 'bird_1', slug: 'mage-silice', capabilities: [] };

    vi.mocked(GameResultModel.create).mockResolvedValueOnce({
      _id: 'result_id_123',
    } as unknown as Awaited<ReturnType<typeof GameResultModel.create>>);

    const req = new NextRequest('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'memory', score: 1500, trophies: 3, maxStreak: 5 })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; id: string };

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.id).toBe('result_id_123');
    
    // Vérification que le modèle a bien reçu l'UID canonique et le slug
    expect(GameResultModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userUid: 'bird_1',
        username: 'mage-silice',
      })
    );

    // Vérification de l'invalidation chirurgicale du cache des classements
    expect(revalidateTag).toHaveBeenCalledWith('game-leaderboard');
    expect(revalidateTag).toHaveBeenCalledWith('leaderboard-memory');
  });
});
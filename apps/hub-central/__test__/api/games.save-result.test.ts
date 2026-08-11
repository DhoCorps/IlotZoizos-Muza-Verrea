import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/games/save-result/route';
import { GameResultModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  GameResultModel: {
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Games Save Result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'quiz', score: 100 })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🔴 [POST] doit rejeter (400) si les données de jeu sont incomplètes', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new Request('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'quiz' }) // score omis
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('incomplètes');
  });

  it('🟢 [POST] doit enregistrer le score avec succès (201) et invalider les caches', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'mage-silice', capabilities: [] };

    vi.mocked(GameResultModel.create).mockResolvedValueOnce({
      _id: 'result_id_123',
    } as any);

    const req = new Request('http://localhost/api/games/save-result', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'memory', score: 1500, trophies: 3, maxStreak: 5 })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.id).toBe('result_id_123');
    
    // Vérification de l'invalidation chirurgicale du cache des classements
    expect(revalidateTag).toHaveBeenCalledWith('game-leaderboard');
    expect(revalidateTag).toHaveBeenCalledWith('leaderboard-memory');
  });
});
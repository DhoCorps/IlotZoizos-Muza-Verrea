import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/quests/apply/route';
import { JobQuestModel } from '@ilot/infrastructure';
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
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: vi.fn((err) => {
    console.error("🔥 [ROUTE ERROR MOCKED CATCH] :", err);
    return NextResponse.json({ success: false, error: "Erreur Interne" }, { status: 500 });
  })
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  JobQuestModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => {
  class MockOrchestrator {
    registerSwipe = vi.fn().mockResolvedValue({
      success: true,
      action: 'LIKE',
      match: false
    });
  }
  return {
    KontaktOrchestrator: MockOrchestrator,
  };
});

describe('API Kontakt Quests Apply - Candidature aux quêtes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l’oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/quests/apply', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'quest_123' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (404) si la quête ciblée n’existe pas', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };
    vi.mocked(JobQuestModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce(null)
    } as any);

    const req = new NextRequest('http://localhost/api/kontakt/quests/apply', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'quest_inexistante' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toContain("introuvable");
  });

  it('🟢 doit enregistrer la candidature avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };
    vi.mocked(JobQuestModel.findOne).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce({ uid: 'quest_123', title: 'Quête React' })
    } as any);

    const req = new NextRequest('http://localhost/api/kontakt/quests/apply', {
      method: 'POST',
      body: JSON.stringify({
        targetUid: 'quest_123',
        coverMessage: 'Prêt à relever le défi!'
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('job-quests');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-quests');
    expect(revalidateTag).toHaveBeenCalledWith('quest-applications-quest_123');
  });
});
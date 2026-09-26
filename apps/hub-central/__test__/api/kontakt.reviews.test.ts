import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/reviews/route';
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

// 🛠️ Mock de l'Orchestrateur pour l'action leaveReview
vi.mock('@ilot/shared-core', () => {
  class MockOrchestrator {
    leaveReview = vi.fn().mockResolvedValue({
      success: true,
      status: 'REVIEW_PUBLISHED'
    });
  }
  return {
    KontaktOrchestrator: MockOrchestrator,
  };
});

describe('API Kontakt Reviews - Dépôt d\'avis de collaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l’oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/reviews', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_123', rating: 5, comment: 'Excellent' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si l’oiseau tente de s’auto-évaluer', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/reviews', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'bird_1', rating: 5, comment: 'Moi-même' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("auto-évaluer");
  });

  it('🟢 doit publier l’avis avec succès (201) si la collaboration est avérée', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/reviews', {
      method: 'POST',
      body: JSON.stringify({
        targetUid: 'target_123',
        rating: 5,
        comment: 'Collaboration mémorable sur le graphe Neo4j.'
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('REVIEW_PUBLISHED');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profile-target_123');
  });
});
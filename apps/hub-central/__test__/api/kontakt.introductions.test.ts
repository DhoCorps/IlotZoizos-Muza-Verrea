import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/introductions/route';
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

// 🛠️ Mock de l'Orchestrateur pour l'action requestIntroduction
vi.mock('@ilot/shared-core', () => {
  class MockOrchestrator {
    requestIntroduction = vi.fn().mockResolvedValue({
      success: true,
      status: 'PENDING'
    });
  }
  return {
    KontaktOrchestrator: MockOrchestrator,
  };
});

describe('API Kontakt Introductions - Gestion de la Passerelle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l’oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/introductions', {
      method: 'POST',
      body: JSON.stringify({ intermediaryUid: 'inter_1', targetUid: 'target_1', message: 'Hello' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si l’oiseau tente de s’utiliser lui-même comme intermédiaire', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/introductions', {
      method: 'POST',
      body: JSON.stringify({ intermediaryUid: 'bird_1', targetUid: 'target_1', message: 'Hello' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("intermédiaire ou cible");
  });

  it('🟢 doit enregistrer la demande de passerelle avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/introductions', {
      method: 'POST',
      body: JSON.stringify({
        intermediaryUid: 'inter_1',
        targetUid: 'target_1',
        message: 'J\'aimerais être présenté à cet oiseau pour une quête.'
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('PENDING');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    expect(revalidateTag).toHaveBeenCalledWith('introductions-inter_1');
    expect(revalidateTag).toHaveBeenCalledWith('user-introductions-bird_1');
  });
});
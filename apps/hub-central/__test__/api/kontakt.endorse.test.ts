import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/kontakt/endorse/route';
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

// 🛠️ Mock de l'Orchestrateur pour l'action endorseSkill
vi.mock('@ilot/shared-core', () => {
  class MockOrchestrator {
    endorseSkill = vi.fn().mockResolvedValue({
      success: true,
      targetUid: 'target_123',
      skill: 'REACT'
    });
  }
  return {
    KontaktOrchestrator: MockOrchestrator,
  };
});

describe('API Kontakt Endorse - Apposition du Sceau de Confiance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l’oiseau n’est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/endorse', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'target_123', skillName: 'React' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter (400) si l’oiseau tente de s’auto-recommander', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/endorse', {
      method: 'POST',
      body: JSON.stringify({ targetUid: 'bird_1', skillName: 'React' }) // Même UID
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("auto-attribuer");
  });

  it('🟢 doit apposer le Sceau de Confiance avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const req = new NextRequest('http://localhost/api/kontakt/endorse', {
      method: 'POST',
      body: JSON.stringify({
        targetUid: 'target_123',
        skillName: 'TypeScript',
        comment: 'Un mage exceptionnel sur le graphe.'
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profile-target_123');
  });
});
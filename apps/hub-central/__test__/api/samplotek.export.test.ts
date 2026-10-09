import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/export/route';
import { NextRequest, NextResponse } from 'next/server';
import { SamplotekOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES GUARDS
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, ctx: unknown) => {
    const mockUser = (global as any).__mockUser || { uid: 'oiseau_A', capabilities: [] };
    return await handler(req, ctx, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockFindLean = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  SampleModel: {
    find: vi.fn(() => ({ lean: mockFindLean })),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Samplotek Export (/api/samplotek/export)', () => {
  let exportProjectSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ Utilisation du spyOn stable sur le prototype (identique à notre fix Upload)
    exportProjectSpy = vi.spyOn(SamplotekOrchestrator.prototype, 'exportProject').mockResolvedValue({
      mongo: { uid: 'proj_999', title: 'Morceau Test' },
      success: true,
      status: 'success'
    } as any);
  });

  it('🔴 [POST] doit rejeter (400) si le corps de la requête est invalide (Mass Assignment / Zod)', async () => {
    const req = new NextRequest('http://localhost/api/samplotek/export', {
      method: 'POST',
      body: JSON.stringify({ title: 'A' }) // Titre trop court, pas de tracks -> Rejet Zod
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(exportProjectSpy).not.toHaveBeenCalled();
  });

  it('🟢 [POST] doit réussir (201) l’export, appeler l\'Orchestrateur et invalider le cache', async () => {
    // Connexion en tant qu'oiseau_A
    (global as any).__mockUser = { uid: 'oiseau_A', capabilities: [] };

    // Simulation de la validation des permissions des samples utilisés
    mockFindLean.mockResolvedValueOnce([
      { uid: 'samp_1', permissions: { allowRadio: true, allowBlindTest: true, allowShowcase: true } }
    ]);

    const req = new NextRequest('http://localhost/api/samplotek/export', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Symphonie de la Silice',
        bpm: 120,
        tracks: [
          { id: 1, sampleUid: 'samp_1', volume: 0.8, isMuted: false }
        ]
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    // 1. Assertions HTTP
    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Morceau Test');

    // 2. Vérification que l'Orchestrateur a bien reçu le bon payload et la signature
    expect(exportProjectSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Symphonie de la Silice', bpm: 120 }),
      expect.objectContaining({ actorUid: 'oiseau_A' })
    );

    // 3. Vérification rigoureuse de l'invalidation du cache
    expect(revalidateTag).toHaveBeenCalledWith('partitas');
    expect(revalidateTag).toHaveBeenCalledWith('partitas-user-oiseau_A');
    expect(revalidateTag).toHaveBeenCalledWith('universal-media');
  });
});
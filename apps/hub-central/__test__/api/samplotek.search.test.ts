import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/samplotek/export/route';
import { NextRequest, NextResponse } from 'next/server';

// 🎭 Mocks des gardes et couches d'infrastructure
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, ctx: unknown) => {
    const mockUser = global.__mockUser || { uid: 'oiseau_A', capabilities: [] };
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

vi.mock('@ilot/shared-core', () => ({
  SamplotekOrchestrator: class {
    exportProject = vi.fn().mockResolvedValue({
      mongo: { uid: 'proj_999', title: 'Morceau Test' }
    });
  },
}));

describe('Route API : Samplotek Export (/api/samplotek/export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 [POST] doit rejeter (400) si le corps de la requête est invalide', async () => {
    const req = new NextRequest('http://localhost/api/samplotek/export', {
      method: 'POST',
      body: JSON.stringify({ title: 'A' }) // Titre trop court, pas de tracks
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('🟢 [POST] doit réussir (201) l’export si les samples et le payload sont valides', async () => {
    global.__mockUser = { uid: 'oiseau_A', capabilities: [] };

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

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Morceau Test');
  });
});
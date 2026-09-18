import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/univershall/constellation/route';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  UniversHallBeaconModel: {
    find: vi.fn(),
  },
}));

// CORRECTION : Utilisation de l'alias canonique `@/lib/api-guards`
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

describe('API Route /api/univershall/constellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit rejeter (400) si le paramètre tag est absent', async () => {
    const req = new NextRequest('http://localhost/api/univershall/constellation');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("paramètre 'tag' est requis");
  });

  it('doit rejeter (400) si le paramètre tag dépasse 50 caractères (protection ReDoS)', async () => {
    const longTag = 'a'.repeat(51);
    const req = new NextRequest(`http://localhost/api/univershall/constellation?tag=${longTag}`);
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("trop long");
  });

  it('doit retourner les balises correspondantes regroupées par module pour un tag donné', async () => {
    vi.mocked(UniversHallBeaconModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          uid: 'beacon_1',
          sourceModule: 'POETRIK',
          title: 'Ode au Ciel',
          tags: ['ciel']
        },
        {
          uid: 'beacon_2',
          sourceModule: 'BIBLIOTEK',
          title: 'Traité des Nuages',
          tags: ['ciel']
        }
      ])
    } as unknown as ReturnType<typeof UniversHallBeaconModel.find>);

    const req = new NextRequest('http://localhost/api/univershall/constellation?tag=ciel');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.tag).toBe('ciel');
    expect(json.totalMatches).toBe(2);
    expect(json.constellation.POETRIK).toHaveLength(1);
    expect(json.constellation.BIBLIOTEK).toHaveLength(1);
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/univershall/beacons/route';
import { UniversHallBeaconModel } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  UniversHallBeaconModel: {
    find: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  UniversHallOrchestrator: class {
    plantBeacon = vi.fn().mockResolvedValue({
      success: true,
      mongo: { uid: 'beacon_123', title: 'Chant Libre', sourceModule: 'POETRIK' }
    });
  },
}));

// CORRECTION : Utiliser le même alias de chemin `@/lib/api-guards` que dans la route
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'architect_1', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Route /api/univershall/beacons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET - Recensement de l\'Agora', () => {
    it('doit récupérer la liste des balises avec succès', async () => {
      vi.mocked(UniversHallBeaconModel.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'beacon_123', title: 'Chant Libre' }])
      } as unknown as ReturnType<typeof UniversHallBeaconModel.find>);

      const req = new NextRequest('http://localhost/api/univershall/beacons?module=POETRIK');
      const res = await GET(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].title).toBe('Chant Libre');
    });
  });

  describe('POST - Plantation de balise', () => {
    it('doit rejeter (400) si les champs indispensables manquent', async () => {
      const req = new NextRequest('http://localhost/api/univershall/beacons', {
        method: 'POST',
        body: JSON.stringify({ title: '' })
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('nécessite un titre');
    });

    it('doit planter une balise avec succès si l\'aura est valide', async () => {
      global.__mockUser = { uid: 'architect_1', capabilities: ['*'] };

      const req = new NextRequest('http://localhost/api/univershall/beacons', {
        method: 'POST',
        body: JSON.stringify({
          sourceModule: 'POETRIK',
          entityUid: 'lex_fr_oiseau',
          title: 'Chant Libre',
          summary: 'Un poème cosmique'
        })
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Chant Libre');
    });
  });
});
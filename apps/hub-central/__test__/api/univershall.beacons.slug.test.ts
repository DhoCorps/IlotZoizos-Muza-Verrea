import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/univershall/beacons/[slug]/route';
import { UniversHallBeaconModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    UniversHallBeaconModel: {
      findOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@ilot/shared-core', () => ({
  UniversHallOrchestrator: class {
    dissolveBeacon = vi.fn().mockResolvedValue({ success: true, purgedCount: 1 });
  },
}));

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

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('API Route /api/univershall/beacons/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET - Auscultation d\'une balise', () => {
    it('doit récupérer la balise avec succès par son slug', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'beacon_123', title: 'Chant Libre', slug: 'chant-libre'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/univershall/beacons/chant-libre');
      const context = { params: Promise.resolve({ slug: 'chant-libre' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Chant Libre');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(UniversHallBeaconModel, 'chant-libre');
    });

    it('doit retourner 404 si la balise est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

      const req = new NextRequest('http://localhost/api/univershall/beacons/inconnu');
      const context = { params: Promise.resolve({ slug: 'inconnu' }) };

      const res = await GET(req, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Balise introuvable');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(UniversHallBeaconModel, 'inconnu');
    });
  });

  describe('DELETE - Dissolution d\'une balise', () => {
    it('doit dissoudre la balise avec succès si l\'Aura est valide et invalider le cache en cascade', async () => {
      global.__mockUser = { uid: 'architect_1', capabilities: ['*'] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'beacon_123',
        slug: 'chant-libre'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/univershall/beacons/chant-libre', {
        method: 'DELETE'
      });
      const context = { params: Promise.resolve({ slug: 'chant-libre' }) };

      const res = await DELETE(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain('dissoute');
      
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(UniversHallBeaconModel, 'chant-libre');
      
      // 💥 Vérification de l'invalidation du cache en cascade
      expect(revalidateTag).toHaveBeenCalledWith('univershall-beacons');
      expect(revalidateTag).toHaveBeenCalledWith('univershall-beacon-chant-libre');
      expect(revalidateTag).toHaveBeenCalledWith('univershall-beacon-beacon_123');
    });
  });
});
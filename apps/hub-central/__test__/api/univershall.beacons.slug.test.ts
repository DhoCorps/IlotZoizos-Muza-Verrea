// apps/hub-central/__test__/api/univershall.beacons.slug.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '@/app/api/univershall/beacons/[slug]/route';
import { UniversHallBeaconModel } from '@ilot/infrastructure';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  UniversHallBeaconModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  UniversHallOrchestrator: class {
    dissolveBeacon = vi.fn().mockResolvedValue({ success: true, purgedCount: 1 });
  },
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { uid: 'architect_1', capabilities: ['*'] };
    return handler(req, context, mockUser);
  },
}));

describe('API Route /api/univershall/beacons/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - Auscultation d\'une balise', () => {
    it('doit récupérer la balise avec succès par son slug', async () => {
      vi.mocked(UniversHallBeaconModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'beacon_123', title: 'Chant Libre', slug: 'chant-libre' })
      } as any);

      const req = new Request('http://localhost/api/univershall/beacons/chant-libre');
      const context = { params: Promise.resolve({ slug: 'chant-libre' }) };

      const res = await GET(req as any, context as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Chant Libre');
    });

    it('doit retourner 404 si la balise est introuvable', async () => {
      vi.mocked(UniversHallBeaconModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      const req = new Request('http://localhost/api/univershall/beacons/inconnu');
      const context = { params: Promise.resolve({ slug: 'inconnu' }) };

      const res = await GET(req as any, context as any);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Balise introuvable');
    });
  });

  describe('DELETE - Dissolution d\'une balise', () => {
    it('doit dissoudre la balise avec succès si l\'Aura est valide', async () => {
      const req = new Request('http://localhost/api/univershall/beacons/chant-libre', {
        method: 'DELETE'
      });
      const context = { params: Promise.resolve({ slug: 'chant-libre' }) };

      const res = await DELETE(req as any, context as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain('dissoute');
    });
  });
});
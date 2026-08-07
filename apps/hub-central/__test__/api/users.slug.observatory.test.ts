import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/observatory/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { ObservatoryEngine } from '@ilot/shared-core';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  ObservatoryEngine: {
    generateReport: vi.fn().mockReturnValue({ metrics: 'healthy' }),
  },
}));

describe('Observatory Slug API [GET]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/observatory/mon-oiseau');
    const res = await GET(req, { params: Promise.resolve({ slug: 'mon-oiseau' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('non identifié');
  });

  it('devrait retourner 403 si l oiseau tente d ausculter un autre sans admin', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'user-bird-1', capabilities: [] },
    } as any);

    const req = new Request('http://localhost/api/observatory/autre-oiseau');
    const res = await GET(req, { params: Promise.resolve({ slug: 'autre-oiseau' }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Souveraineté violée');
  });

  it('devrait réussir (200) l auscultation et appliquer le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        // Utilise le même uid que le slug slugifié (mon-super-oiseau)
        user: { uid: 'mon-super-oiseau', capabilities: [] }, 
      } as any);

      vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'mon-super-oiseau', pseudo: 'Oiseau Test' }),
      } as any);

      const req = new Request('http://localhost/api/observatory/Mon Super Oiseau!');
      const res = await GET(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      
      const data = await res.json();

      expect(res.status).toBe(200); // Maintenant ça devrait passer !
      expect(data.success).toBe(true);
      // ...
    });
});
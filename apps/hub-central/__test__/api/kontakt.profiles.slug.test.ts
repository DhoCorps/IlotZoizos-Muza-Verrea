import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/profiles/route';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// 1. Mocks de base
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, ctx: any) => {
    return await handler(req, ctx, { uid: 'bird_1', capabilities: [] });
  },
}));

vi.mock('@/lib/slugify', () => ({ slugify: vi.fn((val) => val) }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: vi.fn((cb) => cb) }));

// 2. Mock de l'Infrastructure
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

describe('API Kontakt Profiles - Tests incrémentaux', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // TEST GET (Déjà validé)
  it('🟢 [GET] doit récupérer la liste des profils avec succès (200)', async () => {
    vi.mocked(KontaktProfileModel.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ uid: 'kontakt_1' }]),
    } as any);

    const req = new Request('http://localhost/api/kontakt/profiles');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].uid).toBe('kontakt_1');
  });

  // NOUVEAU TEST POST (Succès)
  it('🟢 [POST] doit créer le profil avec succès (201)', async () => {
    // On simule : 
    // 1. Aucune existence (findOne -> null)
    // 2. Aucune collision de slug (findOne -> null)
    vi.mocked(KontaktProfileModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    } as any);

    vi.mocked(KontaktProfileModel.create).mockResolvedValueOnce({ 
      uid: 'kontakt_new', 
      slug: 'dev-matrix' 
    } as any);

    const req = new Request('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({ professionalTitle: 'Dev Matrix' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.uid).toBe('kontakt_new');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
  });
});
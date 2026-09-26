import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/profiles/route';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié. Accès refusé." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    create: vi.fn(),
    findOneAndUpdate: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe('API Kontakt Profiles - Gestion des profils de la canopée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des profils Kontakt avec succès (200)', async () => {
    vi.mocked(KontaktProfileModel.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'kontakt_1', professionalTitle: 'Architecte Graphe' }]),
      }),
    } as unknown as ReturnType<typeof KontaktProfileModel.find>);

    const req = new NextRequest('http://localhost/api/kontakt/profiles');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].uid).toBe('kontakt_1');
    expect(KontaktProfileModel.find).toHaveBeenCalled();
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation / Mise à jour)
  // =========================================================================
  it('🔴 doit rejeter la sédimentation (401) si l\'oiseau n\'est pas connecté', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({ 
        professionalTitle: 'Développeur',
        archetypeClass: 'Cyber-Artisan' 
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer ou sédimenter un profil avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockCreatedProfile = {
      uid: 'kontakt_new',
      userUid: 'bird_1',
      professionalTitle: 'Mage Silice',
      slug: 'mage-silice',
      archetypeClass: 'Mage'
    };

    vi.mocked(KontaktProfileModel.create).mockResolvedValueOnce(mockCreatedProfile as unknown as Awaited<ReturnType<typeof KontaktProfileModel.create>>);

    const req = new NextRequest('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({ 
        professionalTitle: 'Mage Silice', 
        archetypeClass: 'Mage',
        alignment: 'CHAOTIC_NEUTRAL',
        tags: ['silice', 'backend'] 
      })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('kontakt_new');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profile-mage-silice');
  });
});
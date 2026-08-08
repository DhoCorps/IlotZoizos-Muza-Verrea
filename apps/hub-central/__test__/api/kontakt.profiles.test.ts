import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/profiles/route';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié. Accès refusé." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
}));

const mockLean = vi.fn();
const mockSort = vi.fn().mockImplementation(() => ({ lean: mockLean }));
const mockFind = vi.fn().mockImplementation(() => ({ sort: mockSort }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  KontaktProfileModel: {
    find: vi.fn((...args) => mockFind(...args)),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(() => ({ lean: mockLean })),
  },
}));

declare global {
  var __mockUser: any;
}

describe('API Kontakt Profiles - Gestion des profils de la canopée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des profils Kontakt avec succès (200)', async () => {
    mockLean.mockResolvedValueOnce([{ uid: 'kontakt_1', professionalTitle: 'Architecte Graphe' }]);

    const req = new Request('http://localhost/api/kontakt/profiles');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveLength(1);
    expect(json[0].uid).toBe('kontakt_1');
    expect(KontaktProfileModel.find).toHaveBeenCalledWith({});
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation / Mise à jour)
  // =========================================================================
  it('🔴 doit rejeter la sédimentation (401) si l\'oiseau n\'est pas connecté', async () => {
    global.__mockUser = undefined;

    const req = new Request('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({ professionalTitle: 'Développeur' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer ou sédimenter un profil avec succès (201) et invalider le cache', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockCreatedProfile = {
      uid: 'kontakt_new',
      userUid: 'bird_1',
      professionalTitle: 'Mage Silice',
      slug: 'mage-silice'
    };

    vi.mocked(KontaktProfileModel.create).mockResolvedValueOnce(mockCreatedProfile as any);

    const req = new Request('http://localhost/api/kontakt/profiles', {
      method: 'POST',
      body: JSON.stringify({ professionalTitle: 'Mage Silice', alignment: 'CHAOS' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('kontakt_new');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profiles');
    expect(revalidateTag).toHaveBeenCalledWith('kontakt-profile-mage-silice');
  });
});
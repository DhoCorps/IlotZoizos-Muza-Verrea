import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/letrin/fonts/route';
import { FontProject } from '@ilot/infrastructure';
import { getCachedFontProjects } from '@/lib/cache/letrin.cache';
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
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

// 🎯 Mock explicite de la fonction de cache des projets de polices
vi.mock('@/lib/cache/letrin.cache', () => ({
  getCachedFontProjects: vi.fn(),
}));

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  FontProject: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    create: vi.fn(),
  },
}));

describe('API Letr\'In Font Projects - Gestion des projets de polices avec Sceau SHA-256', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des projets avec succès (200)', async () => {
    vi.mocked(getCachedFontProjects).mockResolvedValueOnce([{ _id: 'proj_1', name: 'Matrix Font' }] as unknown as Awaited<ReturnType<typeof getCachedFontProjects>>);

    const req = new NextRequest('http://localhost/api/letrin/fonts');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('Matrix Font');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation & Sceau SHA-256)
  // =========================================================================
  it('🔴 doit rejeter l’envoi si l’oiseau n’est pas connecté (401)', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Matrix Font' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer un nouveau projet, forger le Sceau SHA-256 et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const mockCreatedProject = {
      _id: 'proj_new',
      name: 'Matrix Font'
    };

    vi.mocked(FontProject.create).mockResolvedValueOnce(mockCreatedProject as unknown as Awaited<ReturnType<typeof FontProject.create>>);

    const req = new NextRequest('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Matrix Font' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data._id).toBe('proj_new');
    expect(json.digitalSignature).toBeDefined();
    expect(typeof json.digitalSignature).toBe('string');
    expect(json.digitalSignature.length).toBe(64); // Validation de l'empreinte SHA-256 d'antériorité
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
    expect(revalidateTag).toHaveBeenCalledWith('font-projects');
  });
});
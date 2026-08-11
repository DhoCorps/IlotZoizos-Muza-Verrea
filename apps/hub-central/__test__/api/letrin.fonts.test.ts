import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/letrin/fonts/route';
import { FontProject } from '@ilot/infrastructure';
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
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb) => cb),
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

declare global {
  var __mockUser: any;
}

describe('API Letr\'In Font Projects - Gestion des projets de polices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des projets avec succès (200)', async () => {
    vi.mocked(FontProject.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'proj_1', name: 'Matrix Font' }]),
      }),
    } as any);

    const req = new Request('http://localhost/api/letrin/fonts');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe('Matrix Font');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation)
  // =========================================================================
  it('🔴 doit rejeter l’envoi si l’oiseau n’est pas connecté (401)', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Matrix Font' })
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(401);
  });

  it('🟢 doit créer un nouveau projet avec succès et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const mockCreatedProject = {
      _id: 'proj_new',
      name: 'Matrix Font'
    };

    vi.mocked(FontProject.create).mockResolvedValueOnce(mockCreatedProject as any);

    const req = new Request('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Matrix Font' })
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data._id).toBe('proj_new');
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
    expect(revalidateTag).toHaveBeenCalledWith('font-projects');
  });
});
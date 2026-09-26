import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/kontakt/templates/route';
import { CVTemplateModel } from '@ilot/infrastructure';
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

// 🛡️ MOCK MONGOOSE PLEINEMENT CHAÎNABLE
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  CVTemplateModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
    create: vi.fn(),
  },
}));

describe('API CV Templates - Gestion des modèles de CV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement)
  // =========================================================================
  it('🟢 doit récupérer la liste des modèles de CV avec succès (200)', async () => {
    vi.mocked(CVTemplateModel.find).mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'tmpl_1', title: 'Parchemin Cyber' }]),
      }),
    } as unknown as ReturnType<typeof CVTemplateModel.find>);

    const req = new NextRequest('http://localhost/api/cv-templates');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].uid).toBe('tmpl_1');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation)
  // =========================================================================
  it('🔴 doit rejeter la publication si l’oiseau n’est pas connecté (401)', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouveau Modèle' })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('🔴 doit rejeter la publication (400) si le prix en Shards est négatif', async () => {
    global.__mockUser = { uid: 'bird_1', name: 'Oiseau Fer', capabilities: [] };

    const req = new NextRequest('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Modèle Hack', priceShards: -50 }) // Prix illégal
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données de modèle de CV invalides.");
    expect(json.details.fieldErrors.priceShards[0]).toContain("négatif");
    expect(CVTemplateModel.create).not.toHaveBeenCalled();
  });

  it('🟢 doit créer un modèle de CV avec succès et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', name: 'Oiseau Fer', capabilities: [] };

    const mockCreatedTemplate = {
      uid: 'tmpl_new',
      title: 'Nouveau Modèle',
      authorUid: 'bird_1'
    };

    vi.mocked(CVTemplateModel.create).mockResolvedValueOnce(mockCreatedTemplate as unknown as Awaited<ReturnType<typeof CVTemplateModel.create>>);

    const req = new NextRequest('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouveau Modèle', priceShards: 10 })
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('tmpl_new');
    expect(revalidateTag).toHaveBeenCalledWith('cv-templates');
    expect(revalidateTag).toHaveBeenCalledWith('author-bird_1');
  });

  it('🟢 doit créer un modèle de CV avec les valeurs par défaut de Zod si le corps est vide', async () => {
    global.__mockUser = { uid: 'bird_1', name: 'Oiseau Fer', capabilities: [] };

    const mockCreatedTemplate = {
      uid: 'tmpl_default',
      title: 'Parchemin Sans Nom', // Valeur par défaut Zod
      authorUid: 'bird_1'
    };

    vi.mocked(CVTemplateModel.create).mockResolvedValueOnce(mockCreatedTemplate as unknown as Awaited<ReturnType<typeof CVTemplateModel.create>>);

    const req = new NextRequest('http://localhost/api/cv-templates', {
      method: 'POST',
      body: JSON.stringify({}) // Corps vide !
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    // Vérifie que Zod a bien injecté les defaults dans l'appel Mongoose
    expect(CVTemplateModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Parchemin Sans Nom',
        description: 'Modèle forgé dans la matrice.',
        priceShards: 0,
        barterAccepted: true,
      })
    );
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/letrin/fonts/route';
import { LetrinFontSpriteModel } from '@ilot/infrastructure';
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
  handleRouteError: vi.fn((err) => new Response(JSON.stringify({ error: err.message }), { status: 500 }))
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

// 🎯 Mock explicite de la fonction de cache des projets de polices
vi.mock('@/lib/cache/letrin.cache', () => ({
  getCachedFontProjects: vi.fn(),
}));

// 🛡️ MOCK DU MODÈLE UNIFIÉ LETRINFONTSPRITEMODEL
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  LetrinFontSpriteModel: {
    findOne: vi.fn(), // 🪡 On retire le mock imbriqué ici pour le mettre dans le test
    create: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  LetrinSpriteOrchestrator: class {
    publishFontSprite = vi.fn().mockResolvedValue(true);
  },
}));

describe('API Letr\'In Font Projects - Gestion des projets de polices avec Sceau SHA-256 et Filtrage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  // =========================================================================
  // 🔍 TESTS GET (Recensement & Filtrage)
  // =========================================================================
  it('🟢 doit récupérer la liste des projets et appliquer les filtres (catégorie et tags)', async () => {
    const mockProjects = [
      { uid: 'proj_1', name: 'Humane Typo', category: 'HUMANE', tags: ['classique'], frequencyHz: 432 },
      { uid: 'proj_2', name: 'Mecane Typo', category: 'MECANE', tags: ['industriel'], frequencyHz: 528 },
    ];
    
    vi.mocked(getCachedFontProjects).mockResolvedValue(mockProjects as any);

    // Test sans filtre
    const reqAll = new NextRequest('http://localhost/api/letrin/fonts');
    const resAll = await GET(reqAll, { params: Promise.resolve({}) });
    const jsonAll = await resAll.json();
    expect(resAll.status).toBe(200);
    expect(jsonAll.data).toHaveLength(2);

    // Test avec filtre catégorie
    const reqCategory = new NextRequest('http://localhost/api/letrin/fonts?category=MECANE');
    const resCategory = await GET(reqCategory, { params: Promise.resolve({}) });
    const jsonCategory = await resCategory.json();
    expect(jsonCategory.data).toHaveLength(1);
    expect(jsonCategory.data[0].name).toBe('Mecane Typo');

    // Test avec filtre tag
    const reqTag = new NextRequest('http://localhost/api/letrin/fonts?tag=classique');
    const resTag = await GET(reqTag, { params: Promise.resolve({}) });
    const jsonTag = await resTag.json();
    expect(jsonTag.data).toHaveLength(1);
    expect(jsonTag.data[0].category).toBe('HUMANE');
  });

  // =========================================================================
  // 🚀 TESTS POST (Sédimentation, Validation Stricte & Sceau SHA-256)
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

  it('🔴 doit rejeter la création si les champs stricts Zod échouent (ex: pas de nom)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    const invalidReqData = { category: 'HUMANE' }; // Nom manquant

    const req = new NextRequest('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify(invalidReqData)
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Données de projet de police invalides.");
  });

  it('🟢 doit créer un nouveau projet, intégrer la taxonomie, forger le Sceau SHA-256 et invalider le cache (201)', async () => {
    global.__mockUser = { uid: 'bird_1', slug: 'oiseau-fer', capabilities: [] };

    // 🪡 C'est ICI qu'on mock findOne() avec .lean() pour éviter le plantage !
    vi.mocked(LetrinFontSpriteModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof LetrinFontSpriteModel.findOne>);

    const mockCreatedProject = {
      uid: 'proj_new',
      name: 'Matrix Font',
      category: 'LINEALE',
      frequencyHz: 528
    };

    vi.mocked(LetrinFontSpriteModel.create).mockResolvedValueOnce(mockCreatedProject as unknown as Awaited<ReturnType<typeof LetrinFontSpriteModel.create>>);

    const reqData = { 
      name: 'Matrix Font',
      category: 'LINEALE',
      frequencyHz: 528,
      tags: ['digital']
    };

    const req = new NextRequest('http://localhost/api/letrin/fonts', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Matrix Font');
    expect(json.data.frequencyHz).toBe(528);
    expect(json.digitalSignature).toBeDefined();
    expect(typeof json.digitalSignature).toBe('string');
    expect(json.digitalSignature.length).toBe(64); // Validation de l'empreinte SHA-256 d'antériorité
    
    // Vérification de l'invalidation exhaustive du cache
    expect(revalidateTag).toHaveBeenCalledWith('fonts');
    expect(revalidateTag).toHaveBeenCalledWith('font-projects');
    expect(revalidateTag).toHaveBeenCalledWith('letrin');
  });
});
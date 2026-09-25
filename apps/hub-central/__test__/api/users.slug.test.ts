// Fichier : apps/hub-central/__test__/api/users.slug.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/users/[slug]/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS HOISTÉS
// -------------------------------------------------------------------------
const { mockSyncOiseau } = vi.hoisted(() => {
  return {
    mockSyncOiseau: vi.fn().mockResolvedValue({ success: true, status: 'success', mongo: { pseudo: 'Modifié' }, neo4j: null })
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/users.cache', () => ({
  getCachedOiseau: vi.fn().mockResolvedValue(null),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    OiseauModel: {
      findOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

// 🛡️ Mock direct de la classe OiseauOrchestrator sous forme de fonction constructeur fonctionnelle
vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    OiseauOrchestrator: function() {
      return {
        syncOiseau: mockSyncOiseau,
      };
    },
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((str: string) => str),
}));

vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    return await handler(req, context, mockCurrentUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    if (!mockCurrentUser) {
      return new Response(JSON.stringify({ success: false, message: 'Non autorisé.' }), { status: 401 });
    }
    return await handler(req, context, mockCurrentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[ROUTE ERROR CATCH]`, err);
    return new Response(JSON.stringify({ success: false, message: err.message || 'Erreur interne.' }), { status: 500 });
  }
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Profil & SSOT CV (GET/PATCH /[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
    mockSyncOiseau.mockResolvedValue({ success: true, status: 'success', mongo: { pseudo: 'Modifié' }, neo4j: null });
  });

  const mockOiseauDb = {
    uid: 'dho-123',
    slug: 'dho-123',
    pseudo: 'DhÖ',
    email: 'secret@zoizos.fr',
    frequenceHEX: '#8b9dc3',
    sanctuaire: { signature: "Test" },
    sanctuaireVerrouille: false,
    isGhostMode: false,
    entropieActive: 45,
    capabilities: ['USER'],
    cvProfile: {
      professionalStatus: 'FREELANCE',
      remotePreference: 'FULL_REMOTE',
      experiences: [
        { title: 'Dev Lead', company: 'Ilot', isVisibleInCv: true },
        { title: 'Secret Job', company: 'Anonyme', isVisibleInCv: false }
      ],
      educations: []
    }
  };

  it('doit renvoyer le profil public avec filtrage des expériences non visibles (isVisibleInCv: false)', async () => {
    delete global.__mockUser;
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

    const req = new NextRequest('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBeUndefined();
    expect(json.cvProfile.experiences.length).toBe(1);
    expect(json.cvProfile.experiences[0].title).toBe('Dev Lead');
  });

  it('doit renvoyer le profil intime complet (email + toutes les expériences) si l\'utilisateur consulte le sien', async () => {
    global.__mockUser = { uid: 'dho-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

    const req = new NextRequest('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBe('secret@zoizos.fr');
    expect(json.cvProfile.experiences.length).toBe(2);
  });

  it('doit rejeter (403) un PATCH si l\'utilisateur tente de modifier un autre profil', async () => {
    global.__mockUser = { uid: 'hacker-999', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

    const req = new NextRequest('http://localhost/api/users/dho-123', {
      method: 'PATCH',
      body: JSON.stringify({ pseudo: 'HACKED' })
    });

    const response = await PATCH(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    expect(response.status).toBe(403);
  });

  it('doit accepter un PATCH valide et appeler l\'OiseauOrchestrator pour synchroniser le profil CV (SSOT)', async () => {
    global.__mockUser = { uid: 'dho-123', capabilities: [] };
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as any);

    const req = new NextRequest('http://localhost/api/users/dho-123', {
      method: 'PATCH',
      body: JSON.stringify({ cvProfile: { professionalStatus: 'EMPLOYEE' } })
    });

    const response = await PATCH(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSyncOiseau).toHaveBeenCalled();
  });
});
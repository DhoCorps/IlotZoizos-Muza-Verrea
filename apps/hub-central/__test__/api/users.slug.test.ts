import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécute immédiatement la fonction mise en cache
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
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((str: string) => str), // Mock simple de slugify pour les tests
}));

// Mock unifié de l'api-guard
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    return await handler(req, context, mockCurrentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, message: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
describe('Route API : Miroir (GET /[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
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
  };

  it('doit renvoyer (404) si l\'oiseau n\'existe pas', async () => {
    delete global.__mockUser;
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/users/inconnu');
    const response = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) });
    
    expect(response.status).toBe(404);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'inconnu');
  });

  it('doit renvoyer le profil STANDARD (sans email) pour un visiteur public', async () => {
    delete global.__mockUser;
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBeUndefined(); // 🔒 Email absent en mode public
    expect(json.pseudo).toBe('DhÖ');
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho-123');
  });

  it('doit renvoyer le profil INTIME (avec email) si l\'utilisateur consulte le sien', async () => {
    global.__mockUser = { uid: 'dho-123', capabilities: [] };
    
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBe('secret@zoizos.fr'); // 🔓 Email présent pour soi-même
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho-123');
  });

  it('doit fonctionner avec un slug normalisé', async () => {
    delete global.__mockUser;
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockOiseauDb as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    
    expect(response.status).toBe(200);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho-123');
  });
});
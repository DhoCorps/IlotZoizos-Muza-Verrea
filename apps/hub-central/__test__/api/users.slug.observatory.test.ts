import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/observatory/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ObservatoryEngine } from '@ilot/shared-core';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécute immédiatement la fonction mise en cache
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

vi.mock('@/lib/cache/users.cache', () => ({
  getCachedObservatoryReport: vi.fn(async () => ({
    birdName: 'DhÖ',
    report: { globalVibrationScore: 88, status: 'HARMONIC' }
  })),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// Mock unifié de l'api-guard
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockCurrentUser = global.__mockUser;
    if (!mockCurrentUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockCurrentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
describe('Route API : Observatoire (GET /[slug]/observatory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur l'ObservatoryEngine
    vi.spyOn(ObservatoryEngine, 'generateReport').mockReturnValue({
      globalVibrationScore: 88,
      status: 'HARMONIC',
    } as unknown as ReturnType<typeof ObservatoryEngine.generateReport>);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('doit rejeter (403) si un utilisateur tente d\'ausculter le profil d\'un autre oiseau', async () => {
    global.__mockUser = { uid: 'intrus', capabilities: [] };

    // Résolution préalable requise avant le contrôle de souveraineté strict sur l'UID canonique
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Souveraineté violée");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit réussir (200) et renvoyer le rapport si l\'utilisateur consulte son propre profil', async () => {
    global.__mockUser = { uid: 'dho', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ',
      entropieActive: 42
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.birdName).toBe('DhÖ');
    expect(json.report).toEqual({ globalVibrationScore: 88, status: 'HARMONIC' });
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit autoriser (200) un administrateur (capabilities: ["*"]) à ausculter n\'importe quel profil', async () => {
    global.__mockUser = { uid: 'admin-uid', capabilities: ['*'] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ'
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit renvoyer (404) si l\'oiseau est introuvable', async () => {
    global.__mockUser = { uid: 'dho', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });
});
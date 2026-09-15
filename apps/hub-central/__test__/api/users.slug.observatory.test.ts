import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/observatory/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ObservatoryEngine } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécute immédiatement la fonction mise en cache
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
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
  getCachedObservatoryReport: vi.fn(async (uid) => ({
    birdName: 'DhÖ',
    report: { globalVibrationScore: 88, status: 'HARMONIC' }
  })),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Observatoire (GET /[slug]/observatory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur l'ObservatoryEngine
    vi.spyOn(ObservatoryEngine, 'generateReport').mockReturnValue({
      globalVibrationScore: 88,
      status: 'HARMONIC',
    } as any);
  });

  it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBeDefined();
  });

  it('doit rejeter (403) si un utilisateur tente d\'ausculter le profil d\'un autre oiseau', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'intrus', capabilities: [] }
    } as any);

    // Résolution préalable requise avant le contrôle de souveraineté strict sur l'UID canonique
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ'
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Souveraineté violée");
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit réussir (200) et renvoyer le rapport si l\'utilisateur consulte son propre profil', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'dho', capabilities: [] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ',
      entropieActive: 42
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.birdName).toBe('DhÖ');
    expect(json.report).toEqual({ globalVibrationScore: 88, status: 'HARMONIC' });
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit autoriser (200) un administrateur (capabilities: ["*"]) à ausculter n\'importe quel profil', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'admin-uid', capabilities: ['*'] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
      uid: 'dho',
      slug: 'dho',
      pseudo: 'DhÖ'
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });

  it('doit renvoyer (404) si l\'oiseau est introuvable', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'dho', capabilities: [] }
    } as any);

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'dho');
  });
});
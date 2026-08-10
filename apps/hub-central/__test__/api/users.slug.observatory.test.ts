import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/observatory/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
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

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Observatoire (GET /[slug]/observatory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

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
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('doit rejeter (403) si un utilisateur tente d\'ausculter le profil d\'un autre oiseau', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'intrus', capabilities: [] }
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Souveraineté violée");
  });

  it('doit réussir (200) et renvoyer le rapport si l\'utilisateur consulte son propre profil', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'dho', capabilities: [] }
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'dho', slug: 'dho', pseudo: 'DhÖ', entropieActive: 42 }),
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.birdName).toBe('DhÖ');
    expect(json.report).toEqual({ globalVibrationScore: 88, status: 'HARMONIC' });
  });

  it('doit autoriser (200) un administrateur (capabilities: ["*"]) à ausculter n\'importe quel profil', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'admin-uid', capabilities: ['*'] }
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'dho', slug: 'dho', pseudo: 'DhÖ' }),
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('doit renvoyer (404) si l\'oiseau est introuvable', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'dho', capabilities: [] }
    } as any);

    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const req = new Request('http://localhost/api/users/dho/observatory');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho' }) });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
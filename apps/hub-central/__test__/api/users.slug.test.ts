// Fichier : app/api/users/[slug]/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/users/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { unstable_cache } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécute immédiatement la fonction mise en cache
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  // 🪡 Ajout crucial : on exporte le mock de connectToDatabase
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((str) => str), // Mock simple de slugify pour les tests
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Miroir (GET /[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit renvoyer (404) si l\'oiseau n\'existe pas', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const req = new Request('http://localhost/api/users/inconnu');
    const response = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) });
    
    expect(response.status).toBe(404);
  });

  it('doit renvoyer le profil STANDARD (sans email) pour un visiteur public', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOiseauDb),
    } as any);

    const req = new Request('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBeUndefined(); // 🔒 Email absent en mode public
    expect(json.pseudo).toBe('DhÖ');
  });

  it('doit renvoyer le profil INTIME (avec email) si l\'utilisateur consulte le sien', async () => {
    // 🎭 On simule une session pour le propriétaire 'dho-123'
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: 'dho-123' } 
    } as any);
    
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOiseauDb),
    } as any);

    const req = new Request('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.email).toBe('secret@zoizos.fr'); // 🔓 Email présent pour soi-même
  });

  it('doit fonctionner avec un slug normalisé', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockOiseauDb),
    } as any);

    // Test avec un slug qui nécessite une normalisation
    const req = new Request('http://localhost/api/users/dho-123');
    const response = await GET(req, { params: Promise.resolve({ slug: 'dho-123' }) });
    
    expect(response.status).toBe(200);
    expect(OiseauModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { slug: 'dho-123' },
          { uid: 'dho-123' }
        ])
      })
    );
  });
});
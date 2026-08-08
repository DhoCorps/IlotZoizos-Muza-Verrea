import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/recruitable/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Laisse passer pour tester la logique
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  OiseauOrchestrator: vi.fn().mockImplementation(() => ({
    fosterOiseau: vi.fn(),
  })),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Volière Publique (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('GET - Recensement', () => {
    it('doit rejeter (401) si l\'utilisateur n\'est pas connecté (pas d\'Aura)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/users');
      const response = await GET(req, {}); // 🪡 2 arguments (req et context)
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste des oiseaux filtrés pour un utilisateur connecté', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ 
        user: { uid: 'u-123', capabilities: [] } 
      } as any);
      
      const mockOiseaux = [{ uid: '123', pseudo: 'Alpha' }];
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOiseaux),
      };
      vi.mocked(OiseauModel.find).mockReturnValue(chainMock as any);

      const req = new Request('http://localhost/api/users?search=Alpha');
      const response = await GET(req, {}); // 🪡 2 arguments
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(mockOiseaux);
      expect(OiseauModel.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: expect.any(Array)
      }));
    });
  });

  describe('POST - Éclosion (Inscription)', () => {
    it('doit rejeter (400) si l\'œuf est incomplet', async () => {
      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@mail.com' }), // Manque pseudo et password
      });

      const response = await POST(req, {});
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toContain("L'œuf est incomplet");
    });

    it('doit rejeter (409) si l\'email ou le pseudo existe déjà', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'existing' }),
      } as any);

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'clone@mail.com', pseudo: 'Clone', password: '123' }),
      });

      const response = await POST(req, {});
      expect(response.status).toBe(409);
    });

    it('doit créer l\'Oiseau (201) et invalider le cache de la volière', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const mockFoster = vi.fn().mockResolvedValue({ uid: 'new-uid', slug: 'new-slug' });
      vi.mocked(OiseauOrchestrator).mockImplementation(() => ({ fosterOiseau: mockFoster } as any));

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@mail.com', pseudo: 'NewBird', password: '123' }),
      });

      const response = await POST(req, {});
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.uid).toBe('new-uid');
      
      // Vérification cruciale de l'invalidation du cache de la volière
      expect(revalidateTag).toHaveBeenCalledWith('users');
      expect(mockFoster).toHaveBeenCalledWith(expect.objectContaining({ pseudo: 'NewBird' }));
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/users/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
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
    delete (global as any).__mockUser;
  });

  describe('GET - Recensement', () => {
    it('doit rejeter (401) si l\'Oiseau n\'a pas d\'Aura', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/users');
      // 🪡 Correction : 2 arguments (req et context)
      const response = await GET(req, {});
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste des oiseaux filtrés pour un utilisateur connecté', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);
      
      const mockOiseaux = [{ uid: '123', pseudo: 'Alpha' }];
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOiseaux),
      };
      vi.mocked(OiseauModel.find).mockReturnValue(chainMock as any);

      const req = new Request('http://localhost/api/users?search=Alpha');
      // 🪡 Correction : 2 arguments (req et context)
      const response = await GET(req, {});
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(mockOiseaux);
      expect(OiseauModel.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: expect.any(Array)
      }));
    });
  });

  describe('POST - Éclosion', () => {
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

    it('doit rejeter (401) si l\'Oiseau n\'a pas d\'Aura', async () => {
      // 1. On simule l'absence de session (étranger)
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/users');
      // 🪡 Correction : Seulement 2 arguments (req et context)
      const response = await GET(req, {}); 
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste des oiseaux filtrés pour un utilisateur connecté', async () => {
      // 2. On simule une session active
      vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123', capabilities: [] } } as any);
      
      const mockOiseaux = [{ uid: '123', pseudo: 'Alpha' }];
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockOiseaux),
      };
      vi.mocked(OiseauModel.find).mockReturnValue(chainMock as any);

      const req = new Request('http://localhost/api/users?search=Alpha');
      // 🪡 Correction : Seulement 2 arguments
      const response = await GET(req, {});
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toEqual(mockOiseaux);
      expect(OiseauModel.find).toHaveBeenCalledWith(expect.objectContaining({
        $or: expect.any(Array)
      }));
    });
  });
});
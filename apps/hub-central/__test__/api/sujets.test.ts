import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/sujets/route';
import { getServerSession } from 'next-auth/next';
import { SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SujetModel: {
    find: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  SujetOrchestrator: vi.fn().mockImplementation(() => ({
    fosterSujet: vi.fn().mockResolvedValue({ uid: 'sujet-new', title: 'Nouvelle Pensée' }),
  })),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Bibliothèque & Sujets (GET / POST /api/sujets)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - Consultation de la Bibliothèque', () => {
    it('doit renvoyer les sujets publiés pour un visiteur anonyme (sans session)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      vi.mocked(SujetModel.find).mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: vi.fn().mockResolvedValue([{ uid: 's-1', title: 'Sujet Public' }]),
          }),
        }),
      } as any);

      const req = new Request('http://localhost/api/sujets');
      const response = await GET(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].title).toBe('Sujet Public');
    });

    it('doit intégrer les sujets de l\'auteur connecté si une session est active', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      const mockLean = vi.fn().mockResolvedValue([{ uid: 's-2', title: 'Mon Sujet Privé' }]);
      vi.mocked(SujetModel.find).mockReturnValue({
        sort: () => ({
          limit: () => ({ lean: mockLean }),
        }),
      } as any);

      const req = new Request('http://localhost/api/sujets');
      const response = await GET(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
    });
  });

  describe('POST - Fondation d\'un Nœud de Pensée', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/sujets', {
        method: 'POST',
        body: JSON.stringify({ title: 'Mon Idée', content: 'Substance...' }),
      });

      const response = await POST(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(401);
      expect([
      "Le Nexus est invisible aos étrangers.",
      "Le Nexus est invisible aux étrangers."
      ]).toContain(json.error);
    });

    it('doit réussir (201) la création d\'un sujet, exécuter l\'orchestrateur et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      const req = new Request('http://localhost/api/sujets', {
        method: 'POST',
        body: JSON.stringify({ title: 'La conscience de l\'Îlot', content: 'Contenu profond...' }),
      });

      const response = await POST(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.uid).toBe('sujet-new');

      // 💥 Vérification de l'invalidation chirurgicale du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujets-user-u-123');
    });
  });
});
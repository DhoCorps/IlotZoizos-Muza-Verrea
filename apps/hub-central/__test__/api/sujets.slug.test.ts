import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/sujets/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

vi.mock('@/lib/cache/sujets.cache', () => ({
  getCachedSujetDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    SujetModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock direct du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@ilot/shared-core', () => ({
  SujetOrchestrator: vi.fn().mockImplementation(() => ({
    disintegrateSujet: vi.fn().mockResolvedValue(true),
  })),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Sujet Individuel ([slug]) (GET / PUT / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  describe('GET - Auscultation du Sujet', () => {
    it('doit autoriser (200) la lecture si le sujet est publié (visiteur anonyme)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      // Utilisation du helper unifié mocké
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        status: 'PUBLISHED',
        authorUid: 'u-999',
      } as any);

      const req = new Request('http://localhost/api/sujets/mon-sujet');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('s-1');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');
    });

    it('doit refuser (403) l\'accès à un sujet privé pour un utilisateur non autorisé', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-other', capabilities: [] }
      } as any);

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        status: 'DRAFT',
        authorUid: 'u-owner',
      } as any);

      const req = new Request('http://localhost/api/sujets/mon-sujet');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("intime t'est fermé");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');
    });
  });

  describe('PUT - Mutation du Sujet', () => {
    it('doit réussir (200) si l\'utilisateur est l\'auteur et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-owner', capabilities: [] }
      } as any);

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        authorUid: 'u-owner',
      } as any);

      vi.mocked(SujetModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 's-1', title: 'Titre Modifié' }),
      } as any);

      const req = new Request('http://localhost/api/sujets/mon-sujet', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Titre Modifié' }),
      });

      const response = await PUT(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    });
  });

  describe('DELETE - Désintégration du Sujet', () => {
    it('doit réussir (200) si l\'utilisateur est l\'auteur et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-owner', capabilities: [] }
      } as any);

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        authorUid: 'u-owner',
      } as any);

      const req = new Request('http://localhost/api/sujets/mon-sujet', {
        method: 'DELETE',
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    });
  });
});
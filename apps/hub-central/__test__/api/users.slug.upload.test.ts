import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/users/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mock-key'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/avatar.jpg' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Téléversement & Suppression d\'apparence (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });;

  describe('POST - Téléversement de brindille', () => {
    it('doit rejeter (403) si le visiteur tente de modifier un autre oiseau', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'pirate', capabilities: [] }
      } as any);

      const formData = new FormData();
      const fakeFile = new Blob(['dummy content'], { type: 'image/jpeg' });
      formData.append('file', fakeFile, 'avatar.jpg');
      formData.append('imageType', 'avatarUrl');

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'POST',
      });
      // Mock direct du formData pour le test 403 également
      vi.spyOn(req, 'formData').mockResolvedValue(formData as any);

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Souveraineté violée");
    });

    it('doit réussir (201) le téléversement, mettre à jour MongoDB/Neo4j et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'dho', capabilities: [] }
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'dho', pseudo: 'DhÖ' }),
      } as any);

      const formData = new FormData();
      const fakeFile = new Blob(['dummy content'], { type: 'image/jpeg' });
      formData.append('file', fakeFile, 'avatar.jpg');
      formData.append('imageType', 'avatarUrl');

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'POST',
      });

      // 🪡 Contournement propre de la sérialisation multipart de Node/undici en test
      vi.spyOn(req, 'formData').mockResolvedValue(formData as any);

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      if (response.status !== 201) {
        console.error("🔍 ERREUR DE LA ROUTE REÇUE :", json);
      }

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.publicUrl).toBe('https://cdn.ilot/avatar.jpg');

      expect(revalidateTag).toHaveBeenCalledWith('profile-dho');
      expect(revalidateTag).toHaveBeenCalledWith('users');
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(getNeo4jSession().run).toHaveBeenCalled();
    });
  });

  describe('DELETE - Désintégration d\'artefact', () => {
    it('doit rejeter (403) si l\'utilisateur tente de supprimer la photo d\'un autre', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'intrus', capabilities: [] }
      } as any);

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'DELETE',
        body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar.jpg' }),
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      expect(response.status).toBe(403);
    });

    it('doit réussir (200) la suppression physique et en base, puis invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'dho', capabilities: [] }
      } as any);

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'DELETE',
        body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar.jpg' }),
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      expect(storageService.deleteFile).toHaveBeenCalled();
      expect(OiseauModel.updateOne).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('profile-dho');
    });
  });
});
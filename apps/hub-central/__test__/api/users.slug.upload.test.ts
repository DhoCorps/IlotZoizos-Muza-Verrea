import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/users/[slug]/upload/route';
import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Neutralisation du bouclier withAura cohérente
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'dho', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getNeo4jSession: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

declare global {
  var __mockUser: any;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Téléversement & Suppression d\'apparence (POST / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // Espions actifs sur storageService
    vi.spyOn(storageService, 'generateStructuredKey').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({ publicUrl: 'https://cdn.ilot/avatar.jpg', key: 'mock-key' } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(true as any);

    // Espions actifs sur OiseauModel (Mongoose)
    vi.spyOn(OiseauModel, 'findOneAndUpdate').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'dho', pseudo: 'DhÖ' }),
    } as any);

    vi.spyOn(OiseauModel, 'updateOne').mockResolvedValue({ modifiedCount: 1 } as any);

    // Mock Neo4j
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true),
    } as any);
  });

  describe('POST - Téléversement de brindille', () => {
    it('doit rejeter (403) si le visiteur tente de modifier un autre oiseau', async () => {
      global.__mockUser = { uid: 'pirate', capabilities: [] };

      const formData = new FormData();
      const fakeFile = new Blob(['dummy content'], { type: 'image/jpeg' });
      formData.append('file', fakeFile, 'avatar.jpg');
      formData.append('imageType', 'avatarUrl');

      // Loi du multipart souverain
      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Souveraineté violée");
    });

    it('doit réussir (201) le téléversement, mettre à jour MongoDB/Neo4j et invalider le cache', async () => {
      global.__mockUser = { uid: 'dho', capabilities: [] };

      const formData = new FormData();
      const fakeFile = new Blob(['dummy content'], { type: 'image/jpeg' });
      formData.append('file', fakeFile, 'avatar.jpg');
      formData.append('imageType', 'avatarUrl');

      // Loi du multipart souverain
      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      const json = await response.json();

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
      global.__mockUser = { uid: 'intrus', capabilities: [] };

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'DELETE',
        body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar.jpg' }),
      }) as unknown as NextRequest;

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'dho' }) });
      expect(response.status).toBe(403);
    });

    it('doit réussir (200) la suppression physique et en base, puis invalider le cache', async () => {
      global.__mockUser = { uid: 'dho', capabilities: [] };

      const req = new Request('http://localhost/api/users/dho/avatar', {
        method: 'DELETE',
        body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot/avatar.jpg' }),
      }) as unknown as NextRequest;

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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/projects/[slug]/upload/route';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Neutralisation du bouclier withAura pour les tests unitaires
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProjectModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('ilot-zoizos/fr/projects/proj-1/attachments/test.pdf'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot/doc.pdf', key: 'mock-key' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

declare global {
  var __mockUser: any;
}

function mockNeo4jAuth(isValid: boolean = true) {
  vi.mocked(getNeo4jSession).mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: isValid ? [{ get: (key: string) => key === 'projectCreatorUid' ? 'u-123' : ['project:update'] }] : [],
    }),
    close: vi.fn().mockResolvedValue(true),
  } as any);
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Project Attachments (POST / DELETE /api/projects/[slug]/attachments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('POST - Téléversement d\'un artefact', () => {
    it('doit refuser (429) si le rate limit est dépassé', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false } as any);

      const req = new Request('http://localhost/api/projects/mon-chantier/attachments', {
        method: 'POST',
      });

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(429);
      expect(json.success).toBe(false);
    });

    it('doit téléverser un fichier valide, l\'ajouter au projet et invalider le cache (201)', async () => {
      mockNeo4jAuth(true);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', slug: 'mon-chantier', name: 'Mon Chantier' }),
      } as any);

      vi.mocked(ProjectModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', documents: [{ name: 'test.pdf' }] }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['pdf content'], { type: 'application/pdf' }), 'test.pdf');
      formData.append('label', 'Schéma technique');

      const req = new Request('http://localhost/api/projects/mon-chantier/attachments', {
        method: 'POST',
        body: formData,
      });

      vi.spyOn(req, 'formData').mockResolvedValue(formData);

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.document.name).toBe('test.pdf');

      // 💥 Vérification de l'invalidation du cache en cascade
      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
      expect(revalidateTag).toHaveBeenCalledWith('project-slug-mon-chantier');
    });
  });

  describe('DELETE - Purge d\'un artefact', () => {
    it('doit supprimer l\'artefact du stockage et de la Silice, puis invalider le cache (200)', async () => {
      mockNeo4jAuth(true);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', slug: 'mon-chantier' }),
      } as any);

      vi.mocked(ProjectModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/projects/mon-chantier/attachments', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'https://cdn.ilot/doc.pdf' }),
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
      expect(revalidateTag).toHaveBeenCalledWith('project-slug-mon-chantier');
    });
  });
});
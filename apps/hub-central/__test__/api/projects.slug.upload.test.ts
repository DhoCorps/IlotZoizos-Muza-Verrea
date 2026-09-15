import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/projects/[slug]/upload/route';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    ProjectModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    // Mock du helper unifié s'appuyant sur ProjectModel.findOne
    findEntityBySlugOrUid: vi.fn(async (model, identifier, options = { lean: true }) => {
      const doc = await model.findOne({ $or: [{ slug: identifier }, { uid: identifier }] });
      if (!doc) return null;
      if (options.lean && typeof doc.lean === 'function') {
        return await doc.lean();
      }
      return doc;
    }),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
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
describe('Route API : Project Attachments & Sceau SHA-256 (POST / DELETE /api/projects/[slug]/attachments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ Aligné sur generateKey
    vi.spyOn(storageService, 'generateKey').mockReturnValue('ilot-zoizos/fr/projects/proj-1/attachments/test.pdf');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/doc.pdf',
      key: 'mock-key',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  describe('POST - Téléversement d\'un artefact avec Sceau SHA-256', () => {
    it('doit refuser (429) si le rate limit est dépassé', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 } as any);

      const req = new Request('http://localhost/api/projects/mon-chantier/attachments', {
        method: 'POST',
      });

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(429);
      expect(json.success).toBe(false);
    });

    it('doit téléverser un fichier valide, forger le Sceau SHA-256, l\'ajouter au projet et invalider le cache (201)', async () => {
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

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await POST(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.document.name).toBe('test.pdf');
      expect(json.digitalSignature).toBeDefined();
      expect(typeof json.digitalSignature).toBe('string');
      expect(json.digitalSignature.length).toBe(64); // Validation du SHA-256

      // 💥 Vérification de l'invalidation du cache en cascade
      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
      expect(revalidateTag).toHaveBeenCalledWith('project-slug-mon-chantier');
    });
  });

  describe('DELETE - Purge d\'un artefact', () => {
    it('doit refuser (403) si l\'artefact n\'appartient pas au projet (Protection IDOR)', async () => {
      mockNeo4jAuth(true);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ 
          uid: 'proj-1', 
          slug: 'mon-chantier', 
          documents: [{ url: 'https://cdn.ilot/autre-doc.pdf' }] 
        }),
      } as any);

      const req = new Request('http://localhost/api/projects/mon-chantier/attachments', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'https://cdn.ilot/doc-etranger.pdf' }),
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-chantier' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.message).toContain('Souveraineté brisée');
      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(ProjectModel.updateOne).not.toHaveBeenCalled();
    });

    it('doit supprimer l\'artefact du stockage et de la Silice, puis invalider le cache (200)', async () => {
      mockNeo4jAuth(true);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ 
          uid: 'proj-1', 
          slug: 'mon-chantier',
          documents: [{ url: 'https://cdn.ilot/doc.pdf' }]
        }),
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
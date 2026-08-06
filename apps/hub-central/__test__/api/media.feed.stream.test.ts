// apps/hub-central/__test__/api/media.feed.stream.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/projects/[slug]/upload/route'; // 👈 CORRIGÉ : Le bon chemin d'import
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure'; // 👈 CORRIGÉ : On importe getNeo4jSession

// 🛡️ Mocks stricts
const mockGetServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

vi.mock('../../modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/project/file.pdf'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/project/file.pdf',
      key: 'mocked/project/file.pdf',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/project/file.pdf'),
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
    // 👈 SUTURE : Il faut mocker la fonction d'autorisation Neo4j qui est appelée dans canUpdateProject
    getNeo4jSession: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({
        records: [{
          get: (key: string) => key === 'projectCreatorUid' ? 'user-123' : ['*'] 
        }]
      }),
      close: vi.fn(),
    }),
  };
});

describe('API Projects (Slug) - Attachments Upload & Delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter si non authentifié (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/projects/mon-projet-slug/attachments', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-projet-slug' }) });
      expect(res.status).toBe(401);
    });

    it('🔴 doit retourner 404 si le projet est introuvable par son slug', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      vi.mocked(ProjectModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(null) } as any);

      const req = new Request('http://localhost/api/projects/inconnu/attachments', { method: 'POST' });
      const res = await POST(req, { params: Promise.resolve({ slug: 'inconnu' }) });
      expect(res.status).toBe(404);
    });

    it('🟢 doit téléverser l’artefact avec succès par slug (201)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const mockProject = { uid: 'proj-uid-123', slug: 'mon-projet-slug' };
      vi.mocked(ProjectModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(mockProject) } as any);
      vi.mocked(ProjectModel.findOneAndUpdate).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce({ ...mockProject, documents: [{ name: 'file.pdf' }] }) } as any);

      const formData = new FormData();
      const blob = new Blob(['pdf-content'], { type: 'application/pdf' });
      formData.append('file', blob, 'file.pdf');

      // SUTURE 1 : Le Request natif dans Vitest Node peut ne pas bien parser le FormData passé en body
      // On contourne le crash en injectant une fausse méthode req.formData() directement sur la requête !
      const req = new Request('http://localhost/api/projects/mon-projet-slug/attachments', { method: 'POST' });
      req.formData = () => Promise.resolve(formData); // 👈 LE COUP DE GÉNIE POUR LE POST

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-projet-slug' }) });
      
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Désintégration d’artefact (DELETE)', () => {
    it('🟢 doit désitègrer l’artefact par slug (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } } as any);
      
      const mockProject = { uid: 'proj-uid-123', slug: 'mon-projet-slug' };
      vi.mocked(ProjectModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(mockProject) } as any);
      vi.mocked(ProjectModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      // SUTURE 2 : L'API attend "key", pas "url" !
      const req = new Request('http://localhost/api/projects/mon-projet-slug/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://cdn.ilot.com/mocked/project/file.pdf' })
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-projet-slug' }) });
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(ProjectModel.updateOne).toHaveBeenCalledTimes(1);
    });
  });
});
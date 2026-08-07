import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/projects/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  ProjectModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => {
          if (key === 'projectCreatorUid') return 'user-bird-1';
          if (key === 'allCaps') return [['*']];
          return null;
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('ilot-zoizos/fr/projects/proj-123/attachments/file.png'),
    uploadFile: vi.fn().mockResolvedValue({
      publicUrl: 'https://nexus.ilot.local/storage/file.png',
      key: 'ilot-zoizos/fr/projects/proj-123/attachments/file.png',
    }),
    extractKeyFromUrl: vi.fn().mockReturnValue('ilot-zoizos/fr/projects/proj-123/attachments/file.png'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('Project Attachments Slug API [POST, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects/[slug]/attachments', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Chantier!' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Oiseau non identifié.');
    });

    it('devrait réussir (201) et téléverser le document en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockProject = { uid: 'proj-123', slug: 'mon-chantier' };
      vi.mocked(ProjectModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockProject),
      } as any);

      const mockUpdatedProject = { ...mockProject, documents: [{ name: 'file.png' }] };
      vi.mocked(ProjectModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdatedProject),
      } as any);

      const formData = new FormData();
      const file = new File(['content'], 'file.png', { type: 'image/png' });
      formData.append('file', file);
      formData.append('label', 'Plan');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Chantier!' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(ProjectModel.findOne).toHaveBeenCalledWith({ slug: 'mon-chantier' });
    });
  });

  describe('DELETE /api/projects/[slug]/attachments', () => {
    it('devrait réussir (200) et supprimer l artefact en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockProject = { uid: 'proj-123', slug: 'mon-chantier' };
      vi.mocked(ProjectModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockProject),
      } as any);

      vi.mocked(ProjectModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/projects/Mon Chantier!/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://nexus.ilot.local/storage/file.png' }),
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Chantier!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(ProjectModel.findOne).toHaveBeenCalledWith({ slug: 'mon-chantier' });
      expect(ProjectModel.updateOne).toHaveBeenCalledWith(
        { slug: 'mon-chantier' },
        { $pull: { documents: { url: 'https://nexus.ilot.local/storage/file.png' } } }
      );
    });
  });
});
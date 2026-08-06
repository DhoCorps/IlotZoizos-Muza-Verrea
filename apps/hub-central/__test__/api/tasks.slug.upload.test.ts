// apps/hub-central/__test__/api/tasks.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/tasks/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));
vi.mock('next-auth/next', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));

vi.mock('../../modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn() }));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/tasks/file.pdf'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/tasks/file.pdf',
      key: 'mocked/tasks/file.pdf',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/tasks/file.pdf'),
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TaskModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({
      records: [{
        // 🛡️ SUTURE : Le mock intelligent qui renvoie un Array pour que .flat() fonctionne !
        get: (field: string) => {
          if (field === 'projectCreatorUid') return 'user-123';
          if (field === 'allCaps') return [['*']]; 
          return [];
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  })),
}));

describe('API Tasks (Slug) - Téléversement et Purge d’Artefacts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const req = new Request('http://localhost/api/tasks/atome-test/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'atome-test' }) });
      expect(res.status).toBe(429);
    });

    it('🔴 doit rejeter si non authentifié (401)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/tasks/atome-test/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'atome-test' }) });
      expect(res.status).toBe(401);
    });

    it('🔴 doit retourner 404 si l’atome est introuvable dans la Silice', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: [] } });
      vi.mocked(TaskModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(null) } as any);

      const req = new Request('http://localhost/api/tasks/atome-inconnu/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'atome-inconnu' }) });
      expect(res.status).toBe(404);
    });

    it('🔴 doit rejeter si le format de fichier est refusé (400)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });
      
      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'task-uid-123', content: { title: 'Atome Test' } }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['malware'], { type: 'application/x-executable' }), 'danger.exe');

      const req = new Request('http://localhost/api/tasks/atome-test/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'atome-test' }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('rejette le format');
    });

    it('🟢 doit téléverser l’artefact avec succès et le sceller dans la Silice (201)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });

      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'task-uid-123', content: { title: 'Atome Test' } }),
      } as any);

      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'task-uid-123', documents: [{ name: 'spec.pdf' }] }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['pdf-content'], { type: 'application/pdf' }), 'spec.pdf');
      formData.append('label', 'Spécifications');

      const req = new Request('http://localhost/api/tasks/atome-test/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'atome-test' }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Désintégration (DELETE)', () => {
    it('🟢 doit désitègrer l’artefact physiquement et nettoyer la Silice (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123' } });
      vi.mocked(TaskModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValueOnce({ uid: 'task-uid-123' }) } as any);
      vi.mocked(TaskModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/tasks/atome-test/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://cdn.ilot.com/mocked/tasks/file.pdf' }),
      });

      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'atome-test' }) });
      expect(res.status).toBe(200);
    });
  });
});
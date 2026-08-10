import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/tasks/[slug]/upload/route';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TaskModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn().mockResolvedValue(true),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
  getNeo4jSession: vi.fn(),
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

declare global {
  var __mockUser: any;
}

function mockNeo4jAuth(isOwner: boolean = true) {
  vi.mocked(getNeo4jSession).mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => {
          if (key === 'projectCreatorUid') return isOwner ? 'u-123' : 'other-user';
          return isOwner ? ['*'] : [];
        }
      }],
    }),
    close: vi.fn().mockResolvedValue(true),
  } as any);
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('API Task Artifacts - Greffe et Dissolution de Brindilles (Fichiers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    vi.spyOn(storageService, 'generateStructuredKey').mockReturnValue('hub-central/fr/tasks/task_123/attachments/test.pdf');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/doc.pdf',
      key: 'mock-key',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('mock-key');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  describe('POST /api/tasks/[slug]/artifacts', () => {
    it('doit refuser (429) si le rate limit est dépassé', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 } as any);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.success).toBe(false);
    });

    it('doit renvoyer (404) si l\'atome/tâche est introuvable', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'inconnue' }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Atome introuvable');
    });

    it('doit rejeter (403) si l\'aura est insuffisante', async () => {
      global.__mockUser = { uid: 'stranger', capabilities: [] };
      mockNeo4jAuth(false); // Faux utilisateur non propriétaire

      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'task_123', slug: 'ma-tache' }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['pdf content'], { type: 'application/pdf' }), 'test.pdf');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('doit téléverser un fichier valide, l\'ajouter à l\'atome et invalider le cache (201)', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
      mockNeo4jAuth(true);

      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'task_123', slug: 'ma-tache', name: 'Ma Tâche' }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['pdf content'], { type: 'application/pdf' }), 'test.pdf');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.url).toBe('https://cdn.ilot/doc.pdf');
      expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    });
  });

  describe('DELETE /api/tasks/[slug]/artifacts', () => {
    it('doit supprimer l\'artefact du stockage et de la Silice, puis invalider le cache (200)', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
      mockNeo4jAuth(true);

      vi.mocked(TaskModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'task_123', slug: 'ma-tache' }),
      } as any);

      const req = new Request('http://localhost/api/tasks/ma-tache/artifacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://cdn.ilot/doc.pdf' }),
      }) as unknown as NextRequest;

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'ma-tache' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(storageService.extractKeyFromUrl).toHaveBeenCalledWith('https://cdn.ilot/doc.pdf');
      expect(storageService.deleteFile).toHaveBeenCalledWith('mock-key');
      expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    });
  });
});
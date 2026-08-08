import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/tasks/[slug]/upload/route';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES ET DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('hub-central/fr/tasks/task_123/attachments/test.png'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://cdn.ilot.com/test.png', key: 'key_123' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('key_123'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

const mockLean = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  TaskModel: {
    findOne: vi.fn(() => ({ lean: mockLean })),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

declare global {
  var __mockUser: any;
}

describe('API Task Artifacts - Greffe et Dissolution de Brindilles (Fichiers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  // =========================================================================
  // 📤 TESTS POST (Greffe d'artefact)
  // =========================================================================
  describe('POST /api/tasks/[slug]/artifacts', () => {
    it('doit bloquer (429) si le rate limit est dépassé', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 } as any);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;
      const context = { params: Promise.resolve({ slug: 'ma-tache' }) };

      const res = await POST(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.message).toContain('Trop de téléversements');
    });

    it('doit renvoyer (404) si l\'atome/tâche est introuvable', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      mockLean.mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;
      const context = { params: Promise.resolve({ slug: 'inconnue' }) };

      const res = await POST(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.message).toContain('Atome introuvable');
    });

    it('doit rejeter (403) si l\'aura est insuffisante (non autorisé dans Neo4j sans wildcard)', async () => {
      global.__mockUser = { uid: 'bird_stranger', capabilities: [] };
      mockLean.mockResolvedValueOnce({ uid: 'task_123', slug: 'ma-tache' });

      const mockNeoSession = {
        run: vi.fn().mockResolvedValue({
          records: [{
            get: (key: string) => key === 'projectCreatorUid' ? 'other_user' : []
          }]
        }),
        close: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as any);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;
      const context = { params: Promise.resolve({ slug: 'ma-tache' }) };

      const res = await POST(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.message).toContain('Aura insuffisante');
    });

    it('doit réussir (201) le téléversement et greffer l\'artefact si l\'oiseau est autorisé', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: [] };
      mockLean.mockResolvedValueOnce({ uid: 'task_123', slug: 'ma-tache' });

      const mockNeoSession = {
        run: vi.fn().mockResolvedValue({
          records: [{
            get: (key: string) => key === 'projectCreatorUid' ? 'bird_author' : []
          }]
        }),
        close: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as any);

      const formData = new FormData();
      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      formData.append('file', file);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;
      const context = { params: Promise.resolve({ slug: 'ma-tache' }) };

      const res = await POST(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.url).toBe('https://cdn.ilot.com/test.png');
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(TaskModel.findOneAndUpdate).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    });
  });

  // =========================================================================
  // 🗑️ TESTS DELETE (Désintégration d'artefact)
  // =========================================================================
  describe('DELETE /api/tasks/[slug]/artifacts', () => {
    it('doit réussir (200) la désintégration d\'un artefact et purger MongoDB et R2', async () => {
      global.__mockUser = { uid: 'bird_author', capabilities: ['*'] };
      mockLean.mockResolvedValueOnce({ uid: 'task_123', slug: 'ma-tache' });

      const req = new Request('http://localhost/api/tasks/ma-tache/artifacts', {
        method: 'DELETE',
        body: JSON.stringify({ key: 'https://cdn.ilot.com/test.png' }),
      });
      const context = { params: Promise.resolve({ slug: 'ma-tache' }) };

      const res = await DELETE(req as any, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('key_123');
      expect(TaskModel.updateOne).toHaveBeenCalledWith(
        { uid: 'task_123' },
        { $pull: { documents: { url: 'https://cdn.ilot.com/test.png' } } }
      );
      expect(revalidateTag).toHaveBeenCalledWith('task-ma-tache');
    });
  });
});
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/tasks/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { connectToDatabase, TaskModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  TaskModel: {
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
    generateStructuredKey: vi.fn().mockReturnValue('ilot-zoizos/fr/tasks/task-123/attachments/file.png'),
    uploadFile: vi.fn().mockResolvedValue({
      publicUrl: 'https://nexus.ilot.local/storage/file.png',
      key: 'ilot-zoizos/fr/tasks/task-123/attachments/file.png',
    }),
    extractKeyFromUrl: vi.fn().mockReturnValue('ilot-zoizos/fr/tasks/task-123/attachments/file.png'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('Task Upload Slug API [POST, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/tasks/[slug]/upload', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Oiseau non identifié dans la canopée.');
    });

    it('devrait réussir (201) et sceller l artefact sur l atome avec slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockTask = { uid: 'mon-atome', slug: 'mon-atome' };
      vi.mocked(TaskModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTask),
      } as any);

      const mockUpdatedTask = { ...mockTask, documents: [{ name: 'file.png' }] };
      vi.mocked(TaskModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdatedTask),
      } as any);

      const formData = new FormData();
      const file = new File(['content'], 'file.png', { type: 'image/png' });
      formData.append('file', file);
      formData.append('label', 'Illustration');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(TaskModel.findOne).toHaveBeenCalledWith({ uid: 'mon-atome' });
    });
  });

  describe('DELETE /api/tasks/[slug]/upload', () => {
    it('devrait réussir (200) et dissoudre l artefact avec slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockTask = { uid: 'mon-atome', slug: 'mon-atome' };
      vi.mocked(TaskModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTask),
      } as any);

      vi.mocked(TaskModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/tasks/Mon Atome!/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://nexus.ilot.local/storage/file.png' }),
      });

      const res = await DELETE(req, { params: Promise.resolve({ slug: 'Mon Atome!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(TaskModel.findOne).toHaveBeenCalledWith({ uid: 'mon-atome' });
      expect(TaskModel.updateOne).toHaveBeenCalledWith(
        { uid: 'mon-atome' },
        { $pull: { documents: { url: 'https://nexus.ilot.local/storage/file.png' } } }
      );
    });
  });
});
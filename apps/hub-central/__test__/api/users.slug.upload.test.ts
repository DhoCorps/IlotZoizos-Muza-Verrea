import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/users/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { OiseauModel, getNeo4jSession } from '@ilot/infrastructure';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import type { NextRequest } from 'next/server';

// --- MOCKS ---
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
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('ilot-zoizos/fr/users/user-123/avatarUrl/file.png'),
    uploadFile: vi.fn().mockResolvedValue({
      publicUrl: 'https://nexus.ilot.local/storage/avatar.png',
      key: 'ilot-zoizos/fr/users/user-123/avatarUrl/file.png',
    }),
    extractKeyFromUrl: vi.fn().mockReturnValue('ilot-zoizos/fr/users/user-123/avatarUrl/file.png'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../../../modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('User Upload & Delete Slug API [POST, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/users/[slug]/upload', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('devrait réussir (201) le téléversement d avatar en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'mon-super-oiseau', capabilities: [] },
      } as any);

      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'mon-super-oiseau', pseudo: 'Oiseau Test' }),
      } as any);

      const formData = new FormData();
      const file = new File(['content'], 'avatar.png', { type: 'image/png' });
      formData.append('file', file);
      formData.append('imageType', 'avatarUrl');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledWith(
        { $or: [{ slug: 'mon-super-oiseau' }, { uid: 'mon-super-oiseau' }] },
        { avatarUrl: 'https://nexus.ilot.local/storage/avatar.png' },
        { new: true }
      );
    });
  });

  describe('DELETE /api/users/[slug]/upload', () => {
    it('devrait réussir (200) la purge de l avatar et appliquer le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'mon-super-oiseau', capabilities: [] },
      } as any);

      vi.mocked(OiseauModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/users/Mon Super Oiseau!/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://nexus.ilot.local/storage/avatar.png' }),
      });

      const res = await DELETE(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'Mon Super Oiseau!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(OiseauModel.updateOne).toHaveBeenCalledWith(
        { $or: [{ slug: 'mon-super-oiseau' }, { uid: 'mon-super-oiseau' }] },
        { $set: { avatarUrl: null } }
      );
    });
  });
});
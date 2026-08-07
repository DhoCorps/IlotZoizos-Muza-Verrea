import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/teams/[slug]/upload/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel } from '@ilot/infrastructure';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import type { NextRequest } from 'next/server';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (key: string) => {
          if (key === 'userCaps') return ['*'];
          if (key === 'relCaps') return [];
          return null;
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

// Utilisation du chemin relatif exact pour que Vitest intercepte le module
vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('ilot-zoizos/fr/teams/team-123/attachments/file.png'),
    uploadFile: vi.fn().mockResolvedValue({
      publicUrl: 'https://nexus.ilot.local/storage/file.png',
      key: 'ilot-zoizos/fr/teams/team-123/attachments/file.png',
    }),
    extractKeyFromUrl: vi.fn().mockReturnValue('ilot-zoizos/fr/teams/team-123/attachments/file.png'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../../../../../modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('Team Upload & Delete Slug API [POST, DELETE]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/teams/[slug]/upload', () => {
    it('devrait retourner 401 si l oiseau n est pas authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe('Oiseau non identifié dans la canopée.');
    });

    it('devrait réussir (201) le téléversement en appliquant le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockTeam = { uid: 'team-123', slug: 'mon-super-nid' };
      vi.mocked(TeamModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      const mockUpdatedTeam = { ...mockTeam, documents: [{ name: 'file.png' }] };
      vi.mocked(TeamModel.findOneAndUpdate).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockUpdatedTeam),
      } as any);

      const formData = new FormData();
      const file = new File(['content'], 'file.png', { type: 'image/png' });
      formData.append('file', file);
      formData.append('label', 'Brindille');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as NextRequest;

      const res = await POST(req, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }],
      });
      expect(storageService.uploadFile).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/teams/[slug]/upload', () => {
    it('devrait réussir (200) la purge et utiliser le slugify', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { uid: 'user-bird-1', capabilities: ['*'] },
      } as any);

      const mockTeam = { uid: 'team-123', slug: 'mon-super-nid' };
      vi.mocked(TeamModel.findOne).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce(mockTeam),
      } as any);

      vi.mocked(TeamModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/teams/Mon Super Nid!/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://nexus.ilot.local/storage/file.png' }),
      });

      const res = await DELETE(req as unknown as NextRequest, { params: Promise.resolve({ slug: 'Mon Super Nid!' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(TeamModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'mon-super-nid' }, { uid: 'mon-super-nid' }],
      });
      expect(TeamModel.updateOne).toHaveBeenCalledWith(
        { uid: 'team-123' },
        { $pull: { documents: { url: 'https://nexus.ilot.local/storage/file.png' } } }
      );
      expect(storageService.deleteFile).toHaveBeenCalled();
    });
  });
});
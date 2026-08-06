// apps/hub-central/__test__/api/teams.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/teams/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import { TeamModel } from '@ilot/infrastructure';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));
vi.mock('next-auth/next', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));

vi.mock('../../modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn() }));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/teams/artifact.png'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/teams/artifact.png',
      key: 'mocked/teams/artifact.png',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/teams/artifact.png'),
  },
}));

// 🛡️ SUTURE PROPRE : On mocke @ilot/infrastructure globalement avec TeamModel inclus
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({
      records: [{
        get: (field: string) => {
          if (field === 'userCaps') return ['*'];
          if (field === 'relCaps') return ['*'];
          return [];
        }
      }]
    }),
    close: vi.fn().mockResolvedValue(true),
  })),
}));

describe('API Teams (Slug) - Téléversement et Purge d’Artefacts du Nid', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(429);
    });

    it('🔴 doit rejeter si non authentifié (401)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(401);
    });

    it('🔴 doit retourner 404 si le Nid est introuvable dans la Silice', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: [] } });
      
      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['data'], { type: 'image/png' }), 'test.png');
      const req = new Request('http://localhost/api/teams/nid-inconnu/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'nid-inconnu' }) });
      expect(res.status).toBe(404);
    });

    it('🔴 doit rejeter si le format de fichier est refusé (400)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });
      
      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-123', slug: 'escouade-alpha', name: 'Escouade Alpha' }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['script'], { type: 'application/x-executable' }), 'script.exe');

      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(400);
    });

    it('🟢 doit téléverser l’artefact avec succès et le sceller dans le Nid (201)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-123', slug: 'escouade-alpha', name: 'Escouade Alpha' }),
      } as any);

      vi.mocked(TeamModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-123', documents: [{ name: 'blason.png' }] }),
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['image-data'], { type: 'image/png' }), 'blason.png');
      formData.append('label', 'Blason officiel');

      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Désintégration (DELETE)', () => {
    it('🔴 doit rejeter si non authentifié (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://cdn.ilot.com/mocked/teams/artifact.png' }),
      });

      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si la clé d’artefact est absente (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });
      
      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-123', slug: 'escouade-alpha' }),
      } as any);

      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(400);
    });

    it('🟢 doit désitègrer l’artefact physiquement et nettoyer la Silice du Nid (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'user-123', capabilities: ['*'] } });

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ uid: 'team-uid-123', slug: 'escouade-alpha' }),
      } as any);

      vi.mocked(TeamModel.updateOne).mockResolvedValueOnce({ modifiedCount: 1 } as any);

      const req = new Request('http://localhost/api/teams/escouade-alpha/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'https://cdn.ilot.com/mocked/teams/artifact.png' }),
      });

      const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'escouade-alpha' }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
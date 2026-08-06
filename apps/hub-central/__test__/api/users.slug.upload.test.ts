// apps/hub-central/__test__/api/users.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/users/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';
import { connectToDatabase, OiseauModel, getNeo4jSession } from '@ilot/infrastructure';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));
vi.mock('next-auth/next', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));

vi.mock('../../modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn() }));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/users/avatar.png'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/users/avatar.png',
      key: 'mocked/users/avatar.png',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/users/avatar.png'),
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(true),
  })),
}));

describe('API Users (Slug) - Upload & Delete Avatar / Cover', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const req = new Request('http://localhost/api/users/oiseau-123/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'oiseau-123' }) });
      expect(res.status).toBe(429);
    });

    it('🔴 doit rejeter si non authentifié (401)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/users/oiseau-123/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'oiseau-123' }) });
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si souveraineté violée (403)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'hacker-456', capabilities: [] } });
      const req = new Request('http://localhost/api/users/oiseau-123/upload', { method: 'POST' });
      const res = await POST(req as any, { params: Promise.resolve({ slug: 'oiseau-123' }) });
      expect(res.status).toBe(403);
    });

    it('🟢 doit téléverser l’avatar avec succès et muter l’Oiseau (201)', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });
      mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'oiseau-123', capabilities: ['*'] } });

      const mockUpdatedUser = { uid: 'oiseau-123', pseudo: 'OiseauTest', avatarUrl: 'https://cdn.ilot.com/mocked/users/avatar.png' };
      vi.mocked(OiseauModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUpdatedUser),
      } as any);

      const formData = new FormData();
      const blob = new Blob(['image-data'], { type: 'image/png' });
      formData.append('file', blob, 'avatar.png');
      formData.append('imageType', 'avatarUrl'); // 👈 Ce que l'API réclame

      const req = new Request('http://localhost/api/users/oiseau-123/upload', { method: 'POST', body: formData });
      
      // 🛡️ SUTURE MAGIQUE : On force l'API à lire notre beau formData !
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, { params: Promise.resolve({ slug: 'oiseau-123' }) });
      
      // Si ça crashe, cette fois la console va CHanter très fort !
      if (res.status !== 201) {
         console.log("🚨 RAISON EXACTE DU REJET :", await res.text());
      }
      
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Désintégration (DELETE)', () => {
    it('🟢 doit désintégrer physiquement', async () => {
       mockGetServerSession.mockResolvedValueOnce({ user: { uid: 'oiseau-123', capabilities: ['*'] } });
       
       const req = new Request('http://localhost/api/users/oiseau-123/upload', { 
         method: 'DELETE',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ imageType: 'avatarUrl', url: 'https://cdn.ilot.com/mocked/users/avatar.png' })
       });
       
       const res = await DELETE(req as any, { params: Promise.resolve({ slug: 'oiseau-123' }) });
       expect(res.status).toBe(200);
    });
  });
});
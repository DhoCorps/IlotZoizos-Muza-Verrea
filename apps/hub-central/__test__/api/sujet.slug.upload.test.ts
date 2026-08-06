// apps/hub-central/__test__/api/abyss.sujets.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/sujets/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';

// 🛡️ SUTURE : Mock propre et partagé de session NextAuth
const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));
vi.mock('next-auth/next', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

vi.mock('../../modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/abyss/key.mp3'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/abyss/key.mp3',
      key: 'mocked/abyss/key.mp3',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/abyss/key.mp3'),
  },
}));

describe('API Abyss - Sujet Upload par Slug (/api/abyss/sujets/[slug]/upload)', () => {
  const mockParams = { params: { slug: 'mon-monologue' } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter les requêtes non authentifiées (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload', {
        method: 'POST',
      });

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Alchimiste' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload', {
        method: 'POST',
      });

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Trop de téléversements');
    });

    it('🔴 doit rejeter si aucun média n’est fourni (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Alchimiste' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload', {
        method: 'POST',
        body: formData,
      });
      
      // 🛡️ SUTURE : Simulation du parsing multipart pour Node/Undici
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🟢 doit téléverser le média avec succès et retourner l’URL (201)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Alchimiste' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      const blob = new Blob(['fake-audio-content'], { type: 'audio/mpeg' });
      formData.append('file', blob, 'piste.mp3');

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload', {
        method: 'POST',
        body: formData,
      });

      // 🛡️ SUTURE : Simulation du parsing multipart pour Node/Undici
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req as any, mockParams);
      expect(res.status).toBe(201);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://cdn.ilot.com/mocked/abyss/key.mp3');
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Désintégration de média (DELETE)', () => {
    it('🔴 doit rejeter si non authentifié (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload?url=https://cdn.ilot.com/media.mp3', {
        method: 'DELETE',
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’URL du fichier est manquante (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Alchimiste' } });

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload', {
        method: 'DELETE',
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🟢 doit désintégrer le média physiquement avec succès (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Alchimiste' } });

      const req = new Request('http://localhost/api/abyss/sujets/mon-monologue/upload?url=https://cdn.ilot.com/mocked/abyss/key.mp3', {
        method: 'DELETE',
      });

      const res = await DELETE(req as any, mockParams);
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('mocked/abyss/key.mp3');
    });
  });
});
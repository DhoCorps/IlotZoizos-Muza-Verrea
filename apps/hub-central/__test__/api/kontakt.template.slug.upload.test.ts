// apps/hub-central/__test__/api/kontakt.template.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/kontakt/templates/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));
vi.mock('next-auth/next', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));

vi.mock('../../modules/security/rateLimiter', () => ({ checkRateLimit: vi.fn() }));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/kontakt/key.png'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/kontakt/key.png',
      key: 'mocked/kontakt/key.png',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/kontakt/key.png'),
  },
}));

describe('API Kontakt - Template Upload par Slug (/api/kontakt/templates/[slug]/upload)', () => {
  // 🛡️ SUTURE : Params synchrones pour coller exactement à la route Kontakt
  const mockParams = { params: { slug: 'cyberpunk-cv' } };

  beforeEach(() => { vi.clearAllMocks(); });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter les requêtes non authentifiées (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload', { method: 'POST' });
      const res = await POST(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Mage' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload', { method: 'POST' });
      const res = await POST(req, mockParams);
      expect(res.status).toBe(429);
    });

    it('🔴 doit rejeter si aucun fichier n’est fourni (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Mage' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit téléverser le fichier avec succès et retourner l’URL (201)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Mage' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      formData.append('file', new Blob(['fake-image'], { type: 'image/png' }), 'apercu.png');

      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload', { method: 'POST', body: formData });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req, mockParams);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://cdn.ilot.com/mocked/kontakt/key.png');
    });
  });

  describe('Désintégration de fichier (DELETE)', () => {
    it('🔴 doit rejeter si non authentifié (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload?url=https://cdn.ilot.com/img.png', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’URL du fichier est manquante (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Mage' } });
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(400);
    });

    it('🟢 doit désintégrer le fichier physiquement avec succès (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Mage' } });
      const req = new Request('http://localhost/api/kontakt/templates/cyberpunk-cv/upload?url=https://cdn.ilot.com/mocked/kontakt/key.png', { method: 'DELETE' });
      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(200);
    });
  });
});
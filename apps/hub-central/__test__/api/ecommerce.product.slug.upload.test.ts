// apps/hub-central/__test__/api/ecommerce.product.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../../app/api/ecommerce/products/[slug]/upload/route';
import { storageService } from '../../modules/storage/storage.service';
import { checkRateLimit } from '../../modules/security/rateLimiter';

// 🛡️ SUTURE : Mock propre et partagé de NextAuth
const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));
vi.mock('next-auth/next', () => ({ getServerSession: (...args: any[]) => mockGetServerSession(...args) }));

vi.mock('../../modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mocked/products/key.png'),
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot.com/mocked/products/key.png',
      key: 'mocked/products/key.png',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocked/products/key.png'),
  },
}));

describe('API Ecommerce - Product Upload par Slug (/api/ecommerce/products/[slug]/upload)', () => {
  // 🛡️ SUTURE : Paramètres synchrones pour coller à la signature de la route
  const mockParams = { params: { slug: 'produit-cyber' } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Téléversement (POST)', () => {
    it('🔴 doit rejeter les requêtes non authentifiées (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload', {
        method: 'POST',
      });

      const res = await POST(req, mockParams);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🔴 doit rejeter si le rate limit est dépassé (429)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Marchand' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload', {
        method: 'POST',
      });

      const res = await POST(req, mockParams);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain('Trop de téléversements');
    });

    it('🔴 doit rejeter si aucun fichier n’est fourni (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Marchand' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload', {
        method: 'POST',
        body: formData,
      });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req, mockParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🟢 doit téléverser le fichier avec succès et retourner l’URL (201)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Marchand' } });
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: true, remaining: 9 });

      const formData = new FormData();
      const blob = new Blob(['fake-image'], { type: 'image/png' });
      formData.append('file', blob, 'produit.png');

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload', {
        method: 'POST',
        body: formData,
      });
      (req as any).formData = () => Promise.resolve(formData);

      const res = await POST(req, mockParams);
      expect(res.status).toBe(201);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://cdn.ilot.com/mocked/products/key.png');
      expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Désintégration de l’illustration (DELETE)', () => {
    it('🔴 doit rejeter si non authentifié (401)', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload?url=https://cdn.ilot.com/img.png', {
        method: 'DELETE',
      });

      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter si l’URL du fichier est manquante (400)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Marchand' } });

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload', {
        method: 'DELETE',
      });

      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it('🟢 doit désintégrer l’illustration physiquement avec succès (200)', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: { name: 'Marchand' } });

      const req = new Request('http://localhost/api/ecommerce/products/produit-cyber/upload?url=https://cdn.ilot.com/mocked/products/key.png', {
        method: 'DELETE',
      });

      const res = await DELETE(req, mockParams);
      expect(res.status).toBe(200);
      
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('mocked/products/key.png');
    });
  });
});
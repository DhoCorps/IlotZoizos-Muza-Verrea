import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/ecommerce/products/[slug]/upload/route'; // Ajuste le chemin selon ton arborescence
import { getServerSession } from 'next-auth';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';

// --- MOCKS DES DÉPENDANCES ---
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('hub-central/fr/projects/mon-produit/product_image_test.png'),
    uploadFile: vi.fn().mockResolvedValue({
      publicUrl: 'https://nexus.ilot.local/storage/product_image_test.png',
      key: 'hub-central/fr/projects/mon-produit/product_image_test.png',
    }),
    extractKeyFromUrl: vi.fn().mockReturnValue('hub-central/fr/projects/mon-produit/product_image_test.png'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe('Product Slug Upload & Delete API [slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/products/[slug]/upload', () => {
    it('devrait refuser l\'accès (401) si non authentifié', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Accès non autorisé.');
    });

    it('devrait bloquer la requête (429) en cas de dépassement du rate limit', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'TestUser' } } as any);
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Trop de téléversements');
    });

    it('devrait rejeter (400) si aucune brindille (fichier) n\'est fournie', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'TestUser' } } as any);

      const formData = new FormData();
      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Aucune brindille (fichier) fournie.');
    });

    it('devrait réussir (201) et sceller l\'image si tout est valide', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'TestUser' } } as any);

      const formData = new FormData();
      const file = new File(['dummy content'], 'product.png', { type: 'image/png' });
      formData.append('file', file);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.url).toBe('https://nexus.ilot.local/storage/product_image_test.png');
    });
  });

  describe('DELETE /api/products/[slug]/upload', () => {
    it('devrait refuser l\'accès (401) si non authentifié lors de la suppression', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const req = new Request('http://localhost/api/products/mon-produit/upload?url=https://nexus.ilot.local/file.png', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Accès non autorisé.');
    });

    it('devrait rejeter (400) si l\'URL de l\'artefact à purger est manquante', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'TestUser' } } as any);

      const req = new Request('http://localhost/api/products/mon-produit/upload', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('manquante');
    });

    it('devrait réussir (200) et désintégrer l\'artefact du Nexus', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'TestUser' } } as any);

      const req = new Request('http://localhost/api/products/mon-produit/upload?url=https://nexus.ilot.local/file.png', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('hub-central/fr/projects/mon-produit/product_image_test.png');
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/ecommerce/products/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
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

declare global {
  var __mockUser: any;
}

describe('API Product Slug Upload & Delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  describe('POST /api/products/[slug]/upload', () => {
    it('🔴 doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      global.__mockUser = undefined;

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Accès non autorisé.');
    });

    it('🔴 doit bloquer la requête (429) en cas de dépassement des limites (rate limit)', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 } as any);

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn(),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain('Trop de téléversements');
    });

    it('🔴 doit rejeter (400) si aucun fichier n\'est fourni', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const formData = new FormData();
      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Request;

      const res = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Aucune brindille');
    });

    it('🟢 doit réussir (201), sceller l\'image et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const formData = new FormData();
      const file = new File(['dummy'], 'prod.png', { type: 'image/png' });
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
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('product-mon-produit');
    });
  });

  describe('DELETE /api/products/[slug]/upload', () => {
    it('🔴 doit refuser l\'accès (401) si non authentifié', async () => {
      global.__mockUser = undefined;

      const req = new Request('http://localhost/api/products/mon-produit/upload?url=https://nexus.ilot.local/file.png', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });

      expect(res.status).toBe(401);
    });

    it('🟢 doit supprimer le fichier (200) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      const req = new Request('http://localhost/api/products/mon-produit/upload?url=https://nexus.ilot.local/file.png', {
        method: 'DELETE',
      });
      const res = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(storageService.deleteFile).toHaveBeenCalledWith('hub-central/fr/projects/mon-produit/product_image_test.png');
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('product-mon-produit');
    });
  });
});
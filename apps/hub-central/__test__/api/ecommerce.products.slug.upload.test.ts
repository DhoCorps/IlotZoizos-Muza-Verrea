import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/ecommerce/products/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { ProductModel, UniversalMediaRegistry, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    ProductModel: {
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    },
    UniversalMediaRegistry: {
      indexItem: vi.fn().mockResolvedValue(true),
    },
    // Mock direct du helper pour éviter les bugs de `lean()`
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: any;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('POST /ecommerce/[slug]/upload avec Sceau d\'intégrité', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('hub-central/fr/projects/mon-produit/product_image_123.jpg');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/product.jpg',
      key: 'hub-central/fr/projects/mon-produit/product_image_123.jpg',
    } as any);
    vi.spyOn(storageService, 'extractKeyFromUrl').mockReturnValue('hub-central/fr/projects/mon-produit/product_image_123.jpg');
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as any);
  });

  describe('POST - Upload Image', () => {
    it('🔴 doit rejeter (403) si l\'oiseau n\'est ni le propriétaire ni un Architecte', async () => {
      global.__mockUser = { uid: 'bird_intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        title: 'Mon Super Produit',
        ownerUid: 'merchant_123',
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['fake-image'], { type: 'image/jpeg' }), 'product.jpg');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      expect(response.status).toBe(403);
    });

    it('🟢 doit indexer le produit après upload, forger le sceau technique et retourner (201)', async () => {
      global.__mockUser = { uid: 'merchant_123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        slug: 'mon-produit',
        title: 'Mon Super Produit',
        ownerUid: 'merchant_123',
        ownerSlug: 'marchand',
        priceCents: 1500,
        settings: { consentForShowcase: true },
      } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['fake-image'], { type: 'image/jpeg' }), 'product.jpg');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await POST(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.url).toBe('https://cdn.ilot/product.jpg');
      expect(json.data.digitalSignature).toBeDefined();
      expect(typeof json.data.digitalSignature).toBe('string');
      expect(json.data.digitalSignature.length).toBe(64); // Validation SHA-256 technique
      
      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { uid: 'prod_999' }, 
        { $set: { imageUrl: 'https://cdn.ilot/product.jpg' } }
      );
      expect(UniversalMediaRegistry.indexItem).toHaveBeenCalled();
      expect(revalidateTag).toHaveBeenCalledWith('products');
      expect(revalidateTag).toHaveBeenCalledWith('product-mon-produit');
    });
  });

  describe('DELETE - Purge Image', () => {
    it('🔴 doit rejeter (403) si l\'oiseau n\'est pas le propriétaire de l\'artefact', async () => {
      global.__mockUser = { uid: 'bird_intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        ownerUid: 'merchant_123',
      } as any);

      const req = new Request('http://localhost/api/ecommerce/products/mon-produit/upload?url=https://cdn.ilot/product.jpg', {
        method: 'DELETE',
      }) as unknown as NextRequest;

      const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      expect(response.status).toBe(403);
    });

    it('🟢 doit purger l\'artefact, mettre à jour la base de données et désindexer (200)', async () => {
      global.__mockUser = { uid: 'merchant_123', capabilities: ['*'] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        slug: 'mon-produit',
        ownerUid: 'merchant_123',
      } as any);

      const req = new Request('http://localhost/api/ecommerce/products/mon-produit/upload?url=https://cdn.ilot/product.jpg', {
        method: 'DELETE',
      }) as unknown as NextRequest;

      const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(storageService.extractKeyFromUrl).toHaveBeenCalledWith('https://cdn.ilot/product.jpg');
      expect(storageService.deleteFile).toHaveBeenCalledWith('hub-central/fr/projects/mon-produit/product_image_123.jpg');
      
      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { uid: 'prod_999' }, 
        { $set: { imageUrl: null } }
      );
      
      expect(revalidateTag).toHaveBeenCalledWith('products');
    });
  });
});
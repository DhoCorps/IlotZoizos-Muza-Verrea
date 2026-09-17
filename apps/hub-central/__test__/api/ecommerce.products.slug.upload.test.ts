import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/ecommerce/products/[slug]/upload/route';
import { storageService } from '@/modules/storage/storage.service';
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { ProductModel, UniversalMediaRegistry, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
    withRateLimit: (_actionKey: string, _max: number, _window: number, handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const rateLimitResult = await checkRateLimit(_actionKey, _max, _window);
      if (rateLimitResult && rateLimitResult.allowed === false) {
        return NextResponse.json({ success: false, error: 'Trop de versements. Veuillez patienter.' }, { status: 429 });
      }
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
    assertEntitySovereignty: (user: { uid: string; capabilities?: string[] }, ownerUid?: string) => {
      const isArchitect = user.capabilities?.includes('*');
      if (!isArchitect && (!ownerUid || user.uid !== ownerUid)) {
        throw new (class extends Error {
          status = 403;
          constructor(m: string) { super(m); }
        })("Souveraineté violée.");
      }
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number }).status || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

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
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('POST & DELETE /ecommerce/[slug]/upload avec Sceau d\'intégrité', () => {
  const postHandler = POST as unknown as RouteHandler;
  const deleteHandler = DELETE as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(storageService, 'generateKey').mockReturnValue('hub-central/fr/projects/mon-produit/product_image_123.jpg');
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue({
      success: true,
      publicUrl: 'https://cdn.ilot/product.jpg',
      key: 'hub-central/fr/projects/mon-produit/product_image_123.jpg',
    } as unknown as Awaited<ReturnType<typeof storageService.uploadFile>>);

    // 🛡️ Simulation réaliste d'extraction de clé normalisée
    vi.spyOn(storageService, 'extractKeyFromUrl').mockImplementation((url: string) => {
      if (url.includes('etrangere') || url.includes('foreign')) {
        return 'hub-central/fr/projects/mon-produit/image-etrangere.jpg';
      }
      return 'hub-central/fr/projects/mon-produit/product_image_123.jpg';
    });
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue({ success: true } as unknown as Awaited<ReturnType<typeof storageService.deleteFile>>);
  });

  describe('POST - Upload Image', () => {
    it('🔴 doit rejeter (403) si l\'oiseau n\'est ni le propriétaire ni un Architecte', async () => {
      global.__mockUser = { uid: 'bird_intrus', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        title: 'Mon Super Produit',
        ownerUid: 'merchant_123',
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const formData = new FormData();
      formData.append('file', new Blob(['fake-image'], { type: 'image/jpeg' }), 'product.jpg');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await postHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
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
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const formData = new FormData();
      formData.append('file', new Blob(['fake-image'], { type: 'image/jpeg' }), 'product.jpg');

      const req = {
        headers: { get: () => '127.0.0.1' },
        formData: async () => formData,
      } as unknown as NextRequest;

      const response = await postHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const json = await response.json() as { success: boolean; data: { url: string; digitalSignature: string } };

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
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/ecommerce/products/mon-produit/upload?url=https://cdn.ilot/product.jpg', {
        method: 'DELETE',
      });

      const response = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      expect(response.status).toBe(403);
    });

    it('🔴 doit rejeter (403) si l\'URL fournie n\'appartient pas au produit (Protection IDOR)', async () => {
      global.__mockUser = { uid: 'merchant_123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        slug: 'mon-produit',
        ownerUid: 'merchant_123',
        imageUrl: 'https://cdn.ilot/product.jpg'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/ecommerce/products/mon-produit/upload?url=https://cdn.ilot/image-etrangere.jpg', {
        method: 'DELETE',
      });

      const response = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      expect(response.status).toBe(403);
      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(ProductModel.updateOne).not.toHaveBeenCalled();
    });

    it('🟢 doit purger l\'artefact, mettre à jour la base de données et désindexer (200)', async () => {
      global.__mockUser = { uid: 'merchant_123', capabilities: ['*'] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'prod_999',
        slug: 'mon-produit',
        ownerUid: 'merchant_123',
        imageUrl: 'https://cdn.ilot/product.jpg',
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/ecommerce/products/mon-produit/upload?url=https://cdn.ilot/product.jpg', {
        method: 'DELETE',
      });

      const response = await deleteHandler(req, { params: Promise.resolve({ slug: 'mon-produit' }) });
      const json = await response.json() as { success: boolean };

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
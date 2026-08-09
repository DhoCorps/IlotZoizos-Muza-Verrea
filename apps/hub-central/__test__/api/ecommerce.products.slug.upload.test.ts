// apps/hub-central/__test__/api/ecommerce.products.slug.upload.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/ecommerce/products/[slug]/upload/route';
import { UniversalMediaRegistry, ProductModel } from '@ilot/infrastructure';

// 🛡️ MOCK DU GARDE D'AURA POUR ÉVITER LE CONTEXTE NEXT-AUTH EN TEST
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    // On simule un utilisateur connecté directement sans passer par NextAuth
    return handler(req, context, { uid: 'bird_test_123', role: 'ADMIN' });
  },
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    UniversalMediaRegistry: {
      indexItem: vi.fn(),
      removeItem: vi.fn(),
    },
    ProductModel: {
      findOne: vi.fn(),
    },
  };
});

vi.mock('@/modules/storage/storage.service', () => ({
  storageService: {
    generateStructuredKey: vi.fn().mockReturnValue('mock-key'),
    uploadFile: vi.fn().mockResolvedValue({ publicUrl: 'https://mock-url.com/img.jpg', key: 'mock-key' }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mock-key'),
    deleteFile: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/modules/security/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('POST /ecommerce/[slug]/upload', () => {
  beforeEach(() => {
      vi.clearAllMocks();
      global.__mockUser = undefined;
  });

  it('doit indexer le produit après upload', async () => {
    vi.mocked(ProductModel.findOne).mockResolvedValue({
      uid: 'prod_123',
      title: 'Artefact',
      priceCents: 100,
      settings: { consentForShowcase: true },
    } as any);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    
    const mockReq = {
      headers: { get: () => '127.0.0.1' },
      formData: async () => {
        const fd = new FormData();
        fd.append('file', file);
        return fd;
      }
    } as unknown as Request;

    const response = await POST(mockReq, { params: Promise.resolve({ slug: 'test-slug' }) } as any);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(UniversalMediaRegistry.indexItem).toHaveBeenCalled();
  });
});
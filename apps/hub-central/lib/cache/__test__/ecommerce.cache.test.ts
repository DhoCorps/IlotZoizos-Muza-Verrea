// Fichier : __test__/cache/ecommerce.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedUserWishlists, 
  getCachedVerifiedStores, 
  getCachedMatchmakerResults,
  getCachedMarketplaceProducts
} from '@/lib/cache/ecommerce.cache';
import { WishlistModel, StoreModel, getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { EcommerceOrchestrator } from '@ilot/shared-core';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  WishlistModel: {
    find: vi.fn(),
    create: vi.fn(),
  },
  StoreModel: {
    find: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

describe('Cache : E-commerce Cache Helpers', () => {
  let mockGetMarketplaceProducts: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

    // 🛡️ Ajout de category: 'SYNTH' pour satisfaire le filtre en mémoire de getCachedMarketplaceProducts
    mockGetMarketplaceProducts = vi.spyOn(EcommerceOrchestrator.prototype, 'getMarketplaceProducts').mockResolvedValue({
      success: true,
      data: [{ 
        uid: 'prod_1', 
        title: 'Synthétiseur Ancien', 
        authorSlug: 'bird_1', 
        category: 'SYNTH', 
        tags: ['synth'] 
      }]
    });
  });

  it('doit récupérer ou créer des wishlists en environnement de test', async () => {
    vi.mocked(WishlistModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValueOnce([]),
    } as any);

    vi.mocked(WishlistModel.create).mockResolvedValueOnce({
      uid: 'wish_new_1',
      userUid: 'bird_test',
      name: 'Favoris Principaux',
      productUids: [],
      toObject: () => ({ uid: 'wish_new_1', name: 'Favoris Principaux' })
    } as any);

    const result = await getCachedUserWishlists('bird_test');

    expect(result).toHaveLength(1);
    expect(WishlistModel.create).toHaveBeenCalled();
  });

  it('doit récupérer les boutiques vérifiées', async () => {
    const mockStores = [{ uid: 'store_1', name: 'Boutique Îlot', isVerified: true }];
    vi.mocked(StoreModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockStores),
      }),
    } as any);

    const result = await getCachedVerifiedStores();

    expect(result).toEqual(mockStores);
    expect(StoreModel.find).toHaveBeenCalledWith({ isVerified: true });
  });

  it('doit déléguer la recherche marketplace à l\'orchestrateur avec les tags', async () => {
    const result = await getCachedMarketplaceProducts('SYNTH', 'ALL', 'ALL', ['synth', 'analog']);

    expect(result).toHaveLength(1);
    expect(mockGetMarketplaceProducts).toHaveBeenCalledWith(['synth', 'analog']);
  });

  it('doit exécuter et nettoyer la session Neo4j pour le matchmaker', async () => {
    const mockRun = vi.fn().mockResolvedValue({ records: [] });
    const mockClose = vi.fn().mockResolvedValue(true);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose,
    } as any);

    const result = await getCachedMatchmakerResults('bird_test');

    expect(result).toEqual([]);
    expect(mockRun).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
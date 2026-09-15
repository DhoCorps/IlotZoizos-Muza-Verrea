// Fichier : __test__/cache/ecommerce.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getCachedUserWishlists, 
  getCachedVerifiedStores, 
  getCachedMatchmakerResults 
} from '@/lib/cache/ecommerce.cache';
import { WishlistModel, StoreModel, getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit récupérer ou créer des wishlists en environnement de test', async () => {
    // 🛡️ SUTURE DU CHAÎNAGE : Simulation de .find({ userUid }).lean() retournant un tableau vide
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
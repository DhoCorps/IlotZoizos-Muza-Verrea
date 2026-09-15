// Fichier : __test__/cache/taxonomy.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedTaxonomies } from '@/lib/cache/taxonomy.cache';
import { TaxonomyModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  TaxonomyModel: {
    find: vi.fn(),
  },
}));

describe('Cache : getCachedTaxonomies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit récupérer la liste des taxonomies filtrées par domaine et type en mode test (bypass cache)', async () => {
    const mockTaxonomies = [
      { uid: 'tax_1', name: 'Art', domain: 'CREATIVE', type: 'GENRE' },
      { uid: 'tax_2', name: 'Musique', domain: 'CREATIVE', type: 'GENRE' },
    ];

    vi.mocked(TaxonomyModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTaxonomies),
      }),
    } as any);

    const result = await getCachedTaxonomies('CREATIVE', 'GENRE');

    expect(result).toEqual(mockTaxonomies);
    expect(TaxonomyModel.find).toHaveBeenCalledWith({
      domain: 'CREATIVE',
      type: 'GENRE',
    });
  });

  it('doit récupérer toutes les taxonomies sans filtres lorsque les paramètres sont absents', async () => {
    const mockTaxonomies = [{ uid: 'tax_3', name: 'Général' }];

    vi.mocked(TaxonomyModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTaxonomies),
      }),
    } as any);

    const result = await getCachedTaxonomies();

    expect(result).toEqual(mockTaxonomies);
    expect(TaxonomyModel.find).toHaveBeenCalledWith({});
  });

  it('doit utiliser unstable_cache en dehors du mode test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    vi.mocked(TaxonomyModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as any);

    const result = await getCachedTaxonomies('TECH', 'SKILL');

    expect(result).toEqual([]);
    expect(unstable_cache).toHaveBeenCalled();
  });
});
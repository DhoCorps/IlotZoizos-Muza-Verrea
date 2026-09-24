// Fichier : lib/cache/taxonomy.cache.ts
import { unstable_cache } from 'next/cache';
import { TaxonomyModel } from '@ilot/infrastructure';

export const getCachedTaxonomies = async (domain?: string, type?: string) => {
  return unstable_cache(
    async () => {
      const query: Record<string, unknown> = {};
      if (domain) query.domain = domain;
      if (type) query.type = type;
      return await TaxonomyModel.find(query).sort({ name: 1 }).lean();
    },
    [`taxonomy-list`, JSON.stringify({ domain, type })],
    { revalidate: 3600, tags: ['taxonomy'] }
  )();
};
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedUserLedger, getCachedKomptaAnalytics } from '@/lib/cache/kompta.cache';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  LedgerEntryModel: {
    find: vi.fn(),
  },
}));

describe('Cache : Kompta Cache Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedUserLedger', () => {
    it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
      const mockEntries = [{ type: 'CREDIT', amountCents: 500 }];
      
      vi.spyOn(LedgerEntryModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockEntries),
        }),
      } as any);

      const result = await getCachedUserLedger('bird_kompta_123');

      expect(result).toEqual(mockEntries);
      expect(LedgerEntryModel.find).toHaveBeenCalledWith({ ownerUid: 'bird_kompta_123' });
    });

    it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const mockEntries = [{ type: 'DEBIT', amountCents: 100 }];
      
      vi.spyOn(LedgerEntryModel, 'find').mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockEntries),
        }),
      } as any);

      const result = await getCachedUserLedger('bird_kompta_456');

      expect(result).toEqual(mockEntries);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });

  describe('getCachedKomptaAnalytics', () => {
    it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
      const result = await getCachedKomptaAnalytics('marchand_1', 'store_1', '2026-08');
      
      // Le fetcher de getCachedKomptaAnalytics renvoie toujours null pour forcer l'usage des orchestrateurs
      expect(result).toBeNull();
    });

    it('doit encapsuler la récupération dans unstable_cache en production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const result = await getCachedKomptaAnalytics('marchand_2', 'store_2', '2026-09');

      expect(result).toBeNull();
      expect(unstable_cache).toHaveBeenCalled();
    });
  });
});
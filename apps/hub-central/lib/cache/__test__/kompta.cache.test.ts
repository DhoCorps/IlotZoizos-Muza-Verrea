// Fichier : __test__/cache/kompta.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedLedgerEntries } from '@/lib/cache/kompta.cache';
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

describe('Cache : getCachedLedgerEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit exécuter directement le fetcher en environnement de test (bypass du cache)', async () => {
    const mockEntries = [{ type: 'CREDIT', amountCents: 500 }];
    
    vi.spyOn(LedgerEntryModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEntries),
      }),
    } as any);

    const result = await getCachedLedgerEntries('bird_kompta_123');

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

    const result = await getCachedLedgerEntries('bird_kompta_456');

    expect(result).toEqual(mockEntries);
    expect(unstable_cache).toHaveBeenCalled();
  });
});
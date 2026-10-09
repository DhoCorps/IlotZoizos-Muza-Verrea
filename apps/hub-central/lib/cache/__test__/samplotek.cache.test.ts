import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedSamples, getCachedSample } from '@/lib/cache/samplotek.cache';
import { SampleModel, findEntityBySlugOrUid } from '@ilot/infrastructure';

// 🎭 On mock next/cache pour qu'il renvoie directement la fonction interne
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  SampleModel: {
    find: vi.fn(),
  },
  findEntityBySlugOrUid: vi.fn(),
}));

describe('Cache : Samplotek Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedSamples', () => {
    it('🟢 doit récupérer la banque de sons filtrée (PUBLISHED + Hors Quarantaine)', async () => {
      const mockSamples = [
        { uid: 'sample_1', title: 'Kick 808', status: 'PUBLISHED' },
      ];

      vi.mocked(SampleModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockSamples),
        }),
      } as any);

      const result = await getCachedSamples();

      expect(result).toEqual(mockSamples);
      expect(SampleModel.find).toHaveBeenCalledWith({
        status: 'PUBLISHED',
        'moderation.isQuarantined': false
      });
    });
  });

  describe('getCachedSample', () => {
    it('🟢 doit récupérer un sample spécifique via l\'identifiant', async () => {
      const mockSample = { uid: 'samp_123', title: 'Snare LoFi' };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue(mockSample as any);

      const result = await getCachedSample('samp_123');

      expect(result).toEqual(mockSample);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SampleModel, 'samp_123');
    });
  });
});
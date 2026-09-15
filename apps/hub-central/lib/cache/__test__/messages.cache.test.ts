// Fichier : __test__/cache/messages.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedMessages, getCachedUnreadCount } from '@/lib/cache/messages.cache';
import { MessageModel } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  MessageModel: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Cache : Messages Cache Helpers (messages.cache.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe('getCachedMessages', () => {
    it('doit récupérer, trier, inverser les messages et bypasser le cache en mode test', async () => {
      const mockMessages = [
        { slug: 'msg_2', content: 'Second', createdAt: new Date('2026-03-01T12:00:00Z') },
        { slug: 'msg_1', content: 'First', createdAt: new Date('2026-03-01T11:00:00Z') },
      ];

      vi.mocked(MessageModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockMessages),
          }),
        }),
      } as any);

      const result = await getCachedMessages('salon-general', 30, null);

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('msg_1'); // Inversé par .reverse()
      expect(result[1].slug).toBe('msg_2');
      expect(MessageModel.find).toHaveBeenCalledWith({ conversationSlug: 'salon-general' });
    });

    it('doit utiliser unstable_cache en dehors du mode test', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      vi.mocked(MessageModel.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await getCachedMessages('salon-general', 30);

      expect(result).toEqual([]);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });

  describe('getCachedUnreadCount', () => {
    it('doit compter les messages non lus pour l\'oiseau en mode test', async () => {
      vi.mocked(MessageModel.countDocuments).mockResolvedValueOnce(3);

      const count = await getCachedUnreadCount('oiseau-souverain');

      expect(count).toBe(3);
      expect(MessageModel.countDocuments).toHaveBeenCalledWith({
        senderSlug: { $ne: 'oiseau-souverain' },
        "readBy.userSlug": { $ne: 'oiseau-souverain' },
      });
    });
  });
});
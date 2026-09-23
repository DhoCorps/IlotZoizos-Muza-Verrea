import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedDemopraxicMetrics, getCachedDemopraxicRegister } from '@/lib/cache/demopraxy.cache';
import { OiseauModel } from '@ilot/infrastructure';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import { unstable_cache } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  DemopraxyOrchestrator: class {
    getDemopraxicRegister = vi.fn().mockResolvedValue({
      success: true,
      data: [{ uid: 'demo_1', sanctionCategory: 'TOXICITY' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 }
    });
  }
}));

describe('Cache : Demopraxy Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // TESTS : getCachedDemopraxicMetrics
  // =========================================================================
  describe('getCachedDemopraxicMetrics', () => {
    it('doit lever une erreur si l\'identifiant est vide ou manquant', async () => {
      await expect(getCachedDemopraxicMetrics('')).rejects.toThrow("Identifiant d'oiseau requis");
    });

    it('doit lever une erreur si l\'oiseau est introuvable dans la Silice', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(getCachedDemopraxicMetrics('inconnu')).rejects.toThrow("Oiseau introuvable");
    });

    it('doit récupérer les métriques d\'un oiseau directement en environnement de test', async () => {
      const mockUser = { uid: 'bird_1', slug: 'oiseau-libre', sanctuaryVerrouille: false, demopraxyState: null };
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      const result = await getCachedDemopraxicMetrics('bird_target_1');

      expect(result).toEqual({
        uid: 'bird_1',
        slug: 'oiseau-libre',
        sanctuaryVerrouille: false,
        demopraxyState: null,
      });
      expect(OiseauModel.findOne).toHaveBeenCalledWith({
        $or: [{ slug: 'bird_target_1' }, { uid: 'bird_target_1' }, { pseudo: 'bird_target_1' }]
      });
    });

    it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const mockUser = { uid: 'bird_2', slug: 'oiseau-sage', sanctuaryVerrouille: false, demopraxyState: null };
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockUser),
      } as any);

      const result = await getCachedDemopraxicMetrics('bird_target_2');

      expect(result.uid).toBe('bird_2');
      expect(unstable_cache).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TESTS : getCachedDemopraxicRegister
  // =========================================================================
  describe('getCachedDemopraxicRegister', () => {
    it('doit récupérer le registre démopraxique avec succès en environnement de test', async () => {
      const params = { page: 1, limit: 10, sanctionCategory: 'TOXICITY' as const };
      const result = await getCachedDemopraxicRegister(params);

      expect(result).toHaveProperty('success', true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].uid).toBe('demo_1');
    });

    it('doit encapsuler le registre dans unstable_cache en dehors de l\'environnement de test', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const params = { page: 1, limit: 20 };
      const result = await getCachedDemopraxicRegister(params);

      expect(result).toHaveProperty('success', true);
      expect(unstable_cache).toHaveBeenCalled();
    });
  });
});
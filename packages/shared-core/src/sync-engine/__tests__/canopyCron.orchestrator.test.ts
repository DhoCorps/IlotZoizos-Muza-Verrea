// packages/shared-core/src/sync-engine/__tests__/canopyCron.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopyCronOrchestrator } from '../canopyCron.orchestrator';
import { CanopyAwardModel } from '@ilot/infrastructure';
import * as AwardsRegistry from '@/constants/canopyAwardRegistry.config';

// 🛡️ MOCK DE L'INFRASTRUCTURE (Mongoose)
vi.mock('@ilot/infrastructure', () => ({
  CanopyAwardModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue(true)
  }
}));

describe('CanopyCronOrchestrator (Moteur de Clôture de Cycle)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit parcourir le catalogue et attribuer les trophées du cycle avec succès', async () => {
    // Surcharge propre du catalogue via spyOn (exactement comme dans ton modèle de référence)
    vi.spyOn(AwardsRegistry, 'CANOPY_AWARDS_CATALOG', 'get').mockReturnValue({
      TEST_AWARD: {
        key: 'TEST_AWARD',
        title: 'Trophée de Test',
        category: 'GLORY',
        defaultLore: 'Lore de test',
        evaluator: vi.fn().mockResolvedValue('bird_winner_123')
      }
    } as any);

    await CanopyCronOrchestrator.closeCycle('2026-08');

    expect(CanopyAwardModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(CanopyAwardModel.findOneAndUpdate).toHaveBeenCalledWith(
      { yearMonth: '2026-08', awardKey: 'TEST_AWARD' },
      expect.objectContaining({
        yearMonth: '2026-08',
        awardKey: 'TEST_AWARD',
        title: 'Trophée de Test',
        recipientUid: 'bird_winner_123',
        category: 'GLORY',
        loreDescription: 'Lore de test'
      }),
      { upsert: true, new: true }
    );
  });

  it('⚠️ doit ignorer un trophée si l’évaluateur ne retourne aucun vainqueur', async () => {
    vi.spyOn(AwardsRegistry, 'CANOPY_AWARDS_CATALOG', 'get').mockReturnValue({
      EMPTY_AWARD: {
        key: 'EMPTY_AWARD',
        title: 'Trophée Vide',
        category: 'CHAOS',
        defaultLore: 'Personne',
        evaluator: vi.fn().mockResolvedValue(null)
      }
    } as any);

    await CanopyCronOrchestrator.closeCycle('2026-08');

    expect(CanopyAwardModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
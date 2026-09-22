import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanopyCronOrchestrator } from '../canopyCron.orchestrator';
import { CanopyAwardModel } from '@ilot/infrastructure';
import * as AwardsRegistry from '../../constants/canopyAwardRegistry.config';

// 🛡️ MOCK DE L'INFRASTRUCTURE (Mongoose) sous l'alias centralisé
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    CanopyAwardModel: {
      findOneAndUpdate: vi.fn().mockResolvedValue(true)
    }
  };
});

// 🛡️ MOCK DU TRANSACTION MANAGER (Pour isoler Mongo et Neo4j)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('CanopyCronOrchestrator (Moteur de Clôture de Cycle & Graphe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit parcourir le catalogue, attribuer les trophées dans la Silice et les ancrer dans le Graphe', async () => {
    // Surcharge propre du catalogue via spyOn sur le chemin relatif interne
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
      // On s'assure que la session MongoDB a bien été passée depuis le TransactionManager
      expect.objectContaining({ upsert: true, new: true, session: expect.anything() })
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
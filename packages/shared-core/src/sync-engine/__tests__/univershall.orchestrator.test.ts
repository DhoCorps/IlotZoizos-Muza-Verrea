import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversHallOrchestrator } from '../univershall.orchestrator';
import { UniversHallBeaconModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    UniversHallBeaconModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      deleteOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { 
        run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_beacon_node' }] }) 
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

// 👈 Changement du mock pour pointer sur notre string.engine
vi.mock('../utils/string.engine', () => ({
  generateSlug: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

describe('UniversHallOrchestrator - L\'Agora Centrale', () => {
  let orchestrator: UniversHallOrchestrator;
  const userSignature = { actorUid: 'bird_creator', capabilities: [] };
  const strangerSignature = { actorUid: 'bird_intruder', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new UniversHallOrchestrator();
  });

  describe('plantBeacon (Plantation de Balise)', () => {
    it('doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
      const data = {
        sourceModule: 'POETRIK' as const,
        entityUid: 'lex_fr_oiseau',
        title: 'Chant Libre'
      };

      await expect(
        orchestrator.plantBeacon(data, { actorUid: '', capabilities: [] })
      ).rejects.toThrow(IlotError);
    });

    it('doit rejeter (400) si les champs indispensables manquent', async () => {
      const invalidData = {
        sourceModule: 'POETRIK' as const,
        entityUid: '',
        title: ''
      };

      await expect(
        orchestrator.plantBeacon(invalidData, userSignature)
      ).rejects.toThrow(/nécessite un titre/);
    });

    it('doit planter une balise avec succès dans MongoDB et Neo4j', async () => {
      const data = {
        sourceModule: 'POETRIK' as const,
        entityUid: 'lex_fr_oiseau',
        title: 'Chant Libre',
        summary: 'Un poème cosmique',
        tags: ['poesie', 'ciel']
      };

      vi.mocked(UniversHallBeaconModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(UniversHallBeaconModel.create).mockResolvedValueOnce([
        { uid: 'beacon_123', title: 'Chant Libre', slug: 'chant-libre', sourceModule: 'POETRIK' }
      ] as any);

      const result = await orchestrator.plantBeacon(data, userSignature);

      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('beacon_123');
      expect(UniversHallBeaconModel.create).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('dissolveBeacon (Retrait de Balise)', () => {
    it('doit rejeter (403) si l\'oiseau tente de supprimer une balise qui ne lui appartient pas', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'beacon_123',
        authorUid: 'bird_creator'
      } as any);

      await expect(
        orchestrator.dissolveBeacon('beacon_123', strangerSignature)
      ).rejects.toThrow(/Seul l'auteur ou le système peut retirer cette balise/);
    });

    it('doit dissoudre la balise avec succès si l\'auteur est légitime via findEntityBySlugOrUid', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 'beacon_123',
        authorUid: 'bird_creator'
      } as any);

      const result = await orchestrator.dissolveBeacon('beacon_123', userSignature);

      expect(result.success).toBe(true);
      expect(result.purgedCount).toBe(1);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(UniversHallBeaconModel, 'beacon_123');
      expect(UniversHallBeaconModel.deleteOne).toHaveBeenCalledTimes(1);
    });
  });
});
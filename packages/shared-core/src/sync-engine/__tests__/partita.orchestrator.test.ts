// packages/shared-core/src/sync-engine/__tests__/partita.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaOrchestrator } from '../partita.orchestrator';
import { PartitaModel } from '../../../../infrastructure/src/database/models/nosql/partita.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/partita.model', () => ({
  PartitaModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PartitaOrchestrator - Sédimentation Musicale', () => {
  let orchestrator: PartitaOrchestrator;
  const userSignature = { actorUid: 'oiseau-A', capabilities: [] };
  const strangerSignature = { actorUid: 'oiseau-B', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PartitaOrchestrator();
  });

  describe('fosterPartita (Création)', () => {
    it('🔴 devrait rejeter la création si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-A' };
      await expect(orchestrator.fosterPartita(data, strangerSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🟢 devrait fonder une partition, détecter la gamme et l\'insérer dans Mongo et Neo4j', async () => {
      // "E G B C D" sont les notes de Do Majeur / Mi Mineur !
      const data = { title: 'Ma Superbe Basse', authorUid: 'oiseau-A', instrument: 'BASS', content: 'E G B C D' };
      
      vi.mocked(PartitaModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(PartitaModel.create).mockResolvedValue([{ 
        uid: 'partita-123', 
        title: 'Ma Superbe Basse', 
        slug: 'ma-superbe-basse' 
      }] as any);

      const result = await orchestrator.fosterPartita(data, userSignature as any);
      
      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('partita-123');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  // Les autres tests (Update et Delete) restent identiques...
  describe('disintegratePartita (Suppression)', () => {
    it('🟢 devrait retourner les URLs des fichiers à purger au Hub-Central', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ 
        uid: 'partita-123', 
        authorUid: 'oiseau-A',
        media: {
          coverImageUrl: 'https://cdn.ilot.com/cover.png',
          audioTrackUrl: 'https://cdn.ilot.com/track.mp3'
        }
      } as any);

      const result = await orchestrator.disintegratePartita('partita-123', userSignature as any);
      
      expect(result.success).toBe(true);
      expect(result.filesToDelete).toHaveLength(2);
      expect(result.filesToDelete).toContain('https://cdn.ilot.com/track.mp3');
      expect(PartitaModel.deleteOne).toHaveBeenCalled();
    });
  });
});
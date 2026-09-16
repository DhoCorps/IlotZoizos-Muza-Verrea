import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaOrchestrator } from '../partita.orchestrator';
import { PartitaModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

const mockFindOneAndUpdate = vi.fn();

// 🛡️ MOCK UNIFIÉ ET SÉCURISÉ DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PartitaModel: {
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
      deleteOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
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

      // Simulation d'un document Mongoose avec la méthode .toObject()
      const mockCreatedDoc = {
        uid: 'partita-123', 
        title: 'Ma Superbe Basse', 
        slug: 'ma-superbe-basse',
        toObject: function() { return this; }
      };

      vi.mocked(PartitaModel.create).mockResolvedValue([mockCreatedDoc] as any);

      const result = await orchestrator.fosterPartita(data, userSignature as any);
      
      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('partita-123');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('disintegratePartita (Suppression)', () => {
    it('🟢 devrait retourner les URLs des fichiers à purger au Hub-Central', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ 
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
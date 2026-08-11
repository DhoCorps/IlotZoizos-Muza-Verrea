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

    it('🟢 devrait fonder une partition et l\'insérer dans Mongo et Neo4j', async () => {
      const data = { title: 'Ma Superbe Basse', authorUid: 'oiseau-A', instrument: 'BASS' };
      
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

    it('🔴 devrait lever une erreur (404) si l\'oiseau créateur n\'est pas trouvé dans Neo4j', async () => {
      // Simulation d'une rupture Neo4j : l'utilisateur n'existe pas dans le graphe
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, { run: vi.fn().mockResolvedValue({ records: [] }) } as any);
      });

      vi.mocked(PartitaModel.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(null) } as any);
      vi.mocked(PartitaModel.create).mockResolvedValue([{ uid: 'partita-123' }] as any);

      const data = { title: 'Ghost Track', authorUid: 'oiseau-A' };
      await expect(orchestrator.fosterPartita(data, userSignature as any)).rejects.toThrow(/Oiseau créateur introuvable/);
    });
  });

  describe('updatePartita (Mutation)', () => {
    it('🔴 devrait rejeter si la partition n\'existe pas dans la Silice', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue(null);
      await expect(orchestrator.updatePartita('inconnu', {}, userSignature as any))
        .rejects.toThrow(/introuvable dans la Silice/);
    });

    it('🔴 devrait rejeter si l\'oiseau n\'est pas l\'auteur (Usurpation)', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ authorUid: 'oiseau-B' } as any);
      await expect(orchestrator.updatePartita('partita-123', {}, userSignature as any))
        .rejects.toThrow(/Tu ne peux modifier que tes propres/);
    });

    it('🟢 devrait résoudre par UID canonique et mettre à jour la partition', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ uid: 'partita-123', authorUid: 'oiseau-A' } as any);
      
      vi.mocked(PartitaModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'partita-123', title: 'Nouveau Titre' })
      } as any);

      const result = await orchestrator.updatePartita(
        'partita-slug', 
        { title: 'Nouveau Titre' }, 
        userSignature as any
      );

      expect(result.success).toBe(true);
      expect(result.mongo.title).toBe('Nouveau Titre');
      expect(PartitaModel.findOne).toHaveBeenCalledTimes(1); // Résolution MongoDB
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1); // Propagation Neo4j
    });
  });

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
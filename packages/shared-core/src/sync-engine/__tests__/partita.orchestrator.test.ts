import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PartitaOrchestrator } from '../partita.orchestrator';
import { PartitaModel } from '../../../../infrastructure/src/database/models/nosql/partita.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// --- MOCKS CIBLÉS SUR LE CHEMIN RELATIF EXACT DE L'ORCHESTRATEUR ---
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
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('PartitaOrchestrator', () => {
  let orchestrator: PartitaOrchestrator;
  
  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PartitaOrchestrator();
  });

  describe('fosterPartita (Création)', () => {
    it('devrait rejeter la création si l oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-A' };
      const signature = { actorUid: 'oiseau-B', capabilities: [] };

      await expect(orchestrator.fosterPartita(data, signature))
        .rejects.toThrow(IlotError);
    });

    it('devrait fonder une partition et l insérer dans Mongo et Neo4j', async () => {
      const data = { title: 'Ma Superbe Basse', authorUid: 'oiseau-A', instrument: 'BASS' };
      const signature = { actorUid: 'oiseau-A', capabilities: [] };

      vi.mocked(PartitaModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(PartitaModel.create).mockResolvedValue([{ 
        uid: 'partita-123', 
        title: 'Ma Superbe Basse', 
        slug: 'ma-superbe-basse' 
      }] as any);

      const result = await orchestrator.fosterPartita(data, signature);

      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('partita-123');
    });
  });

  describe('updatePartita (Mutation)', () => {
    it('devrait rejeter si la partition n existe pas', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue(null);

      await expect(orchestrator.updatePartita('inconnu', {}, { actorUid: 'oiseau-A', capabilities: [] }))
        .rejects.toThrow(/introuvable/);
    });

    it('devrait rejeter si l oiseau n est pas l auteur', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ authorUid: 'oiseau-B' } as any);

      await expect(orchestrator.updatePartita('partita-123', {}, { actorUid: 'oiseau-A', capabilities: [] }))
        .rejects.toThrow(/Tu ne peux modifier que tes propres/);
    });

    it('devrait mettre à jour la partition', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ uid: 'partita-123', authorUid: 'oiseau-A' } as any);
      
      vi.mocked(PartitaModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'partita-123', title: 'Nouveau Titre' })
      } as any);

      const result = await orchestrator.updatePartita(
        'partita-123', 
        { title: 'Nouveau Titre' }, 
        { actorUid: 'oiseau-A', capabilities: [] }
      );

      expect(result.success).toBe(true);
      expect(result.mongo.title).toBe('Nouveau Titre');
    });
  });

  describe('disintegratePartita (Suppression)', () => {
    it('devrait retourner les URLs des fichiers à supprimer', async () => {
      vi.mocked(PartitaModel.findOne).mockResolvedValue({ 
        uid: 'partita-123', 
        authorUid: 'oiseau-A',
        media: {
          coverImageUrl: 'https://storage.ilot.com/cover.png',
          audioTrackUrl: 'https://storage.ilot.com/track.mp3'
        }
      } as any);

      const result = await orchestrator.disintegratePartita('partita-123', { actorUid: 'oiseau-A', capabilities: [] });

      expect(result.success).toBe(true);
      expect(result.filesToDelete).toHaveLength(2);
      expect(PartitaModel.deleteOne).toHaveBeenCalled();
    });
  });
});
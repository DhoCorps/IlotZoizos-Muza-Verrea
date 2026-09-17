import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SamplotekOrchestrator } from '../samplotek.orchestrator';
import { SampleModel, PartitaModel, UniversalMediaRegistry } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SampleModel: {
      create: vi.fn(),
      findOne: vi.fn(),
    },
    PartitaModel: {
      create: vi.fn(),
      findOne: vi.fn(),
    },
    OiseauModel: {
      findOne: vi.fn(),
    },
    UniversalMediaRegistry: { 
      indexItem: vi.fn() 
    }
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

vi.mock('../utils/string.engine', () => ({
  generateSlug: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

describe('SamplotekOrchestrator - Le Moteur du Studio E-Jay', () => {
  let orchestrator: SamplotekOrchestrator;
  const userSignature = { actorUid: 'bird_canonical_dj', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SamplotekOrchestrator();
  });

  describe('fosterSample (Gravure)', () => {
    it('🔴 devrait rejeter si le sample manque de métadonnées vitales ou de sceau', async () => {
      const invalidData = { title: 'Kick' }; // Manque audioUrl et signature
      await expect(orchestrator.fosterSample(invalidData, userSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🟢 devrait sédimenter un sample et le tisser dans Neo4j avec un slug garanti unique', async () => {
      const sampleData = {
        uid: 'samp_123',
        title: 'Snare LoFi',
        audioUrl: 'https://cdn/snare.wav',
        digitalSignature: 'hash123',
        tempoBpm: 90,
        style: 'LoFi'
      };

      // 🛠️ Correction du mock pour supporter le chaînage .session(...).lean()
      vi.mocked(SampleModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as any);

      vi.mocked(SampleModel.create).mockResolvedValue([{ ...sampleData, slug: 'snare-lofi' }] as any);

      const result = await orchestrator.fosterSample(sampleData, userSignature as any);

      expect(result.success).toBe(true);
      expect(result.mongo.slug).toBe('snare-lofi');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportProject (Mixage)', () => {
    it('🔴 devrait rejeter un projet vide sans piste', async () => {
      const invalidProject = { title: 'Mon Mix', tracks: [] };
      await expect(orchestrator.exportProject(invalidProject, userSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('🟢 devrait sédimenter le projet, lier les samples dans Neo4j et indexer pour la radio', async () => {
      const projectData = {
        uid: 'mix_999',
        title: 'Mon Mix LoFi',
        bpm: 90,
        tracks: [{ id: 1, sampleUid: 'samp_123', volume: 0.8, isMuted: false }],
        metadata: {
          usedSampleUids: ['samp_123'],
          permissions: { allowShowcase: true, allowRadio: true }
        }
      };

      // 🛠️ Correction du mock pour supporter le chaînage .session(...).lean()
      vi.mocked(PartitaModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as any);

      vi.mocked(PartitaModel.create).mockResolvedValue([{ ...projectData, slug: 'mon-mix-lofi' }] as any);

      const result = await orchestrator.exportProject(projectData, userSignature as any);

      expect(result.success).toBe(true);
      expect(PartitaModel.create).toHaveBeenCalled();
      
      // Vérification de l'indexation Showcase
      expect(UniversalMediaRegistry.indexItem).toHaveBeenCalledWith(
        expect.objectContaining({ mediaId: 'mix_999', consentForShowcase: true })
      );
    });
  });
});
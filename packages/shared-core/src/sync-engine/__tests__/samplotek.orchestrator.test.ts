import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SamplotekOrchestrator } from '../samplotek.orchestrator';
import { 
  SampleModel, 
  PartitaModel, 
  UniversalMediaRegistry,
  UniversHallBeaconModel,
  LedgerEntryModel
} from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SampleModel: { create: vi.fn(), findOne: vi.fn() },
    PartitaModel: { create: vi.fn(), findOne: vi.fn() },
    OiseauModel: { findOne: vi.fn() },
    UniversHallBeaconModel: { create: vi.fn() },
    LedgerEntryModel: { create: vi.fn() },
    UniversalMediaRegistry: { indexItem: vi.fn() }
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { 
        run: vi.fn().mockResolvedValue({ 
          records: [{ get: (key: string) => key === 'royaltyBeneficiaries' ? ['bird_artist_1'] : 'mock_node' }] 
        }) 
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

vi.mock('../utils/string.engine', () => ({
  generateSlug: vi.fn((val) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('../utils/orchestrator.engine', () => ({
  ensureUniqueSlug: vi.fn().mockResolvedValue('unique-slug-verified'),
}));

describe('SamplotekOrchestrator - Le Moteur du Studio E-Jay', () => {
  let orchestrator: SamplotekOrchestrator;
  const userSignature = { actorUid: 'bird_canonical_dj', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new SamplotekOrchestrator();
  });

  describe('fosterSample (Gravure)', () => {
    it('🔴 devrait rejeter si le sample manque de métadonnées vitales ou du Sceau', async () => {
      const invalidData = { title: '', audioUrl: '', cryptoSeal: undefined as any }; 
      await expect(orchestrator.fosterSample(invalidData, userSignature as any)).rejects.toThrow(IlotError);
    });

    it('🟢 devrait sédimenter un sample et le tisser dans Neo4j avec un slug garanti', async () => {
      const sampleData = {
        uid: 'samp_123',
        title: 'Snare LoFi',
        audioUrl: 'https://cdn/snare.wav',
        cryptoSeal: { digitalSignature: 'hash123', timestampedAt: new Date(), copyrightMetadata: { role: 'CREATOR' } },
        tempoBpm: 90,
        style: 'LoFi'
      };

      vi.mocked(SampleModel.findOne).mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) } as any);
      vi.mocked(SampleModel.create).mockResolvedValue([{ ...sampleData, slug: 'snare-lofi' }] as any);

      const result = await orchestrator.fosterSample(sampleData, userSignature as any);

      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('reportSample (Modération)', () => {
    it('🟢 devrait incrémenter les signalements et placer un sample en QUARANTAINE si > 3', async () => {
      const mockSample = { uid: 'samp_bad', moderation: { reportsCount: 3, isQuarantined: false }, status: 'PUBLISHED', save: vi.fn().mockResolvedValue(true) };
      vi.mocked(SampleModel.findOne).mockReturnValue({ session: vi.fn().mockResolvedValue(mockSample) } as any);

      const result = await orchestrator.reportSample('samp_bad', userSignature as any);

      expect(result.success).toBe(true);
      expect(result.isQuarantined).toBe(true); 
      expect(mockSample.status).toBe('QUARANTINED');
    });
  });

  describe('exportProject (Mixage, Royalties & Agora)', () => {
    it('🔴 devrait rejeter un projet vide sans piste', async () => {
      await expect(orchestrator.exportProject({ title: 'Mon Mix', tracks: [] }, userSignature as any)).rejects.toThrow(IlotError);
    });

    it('🟢 devrait sédimenter le projet, lier les samples dans Neo4j, verser les Royalties et indexer pour la radio', async () => {
      const projectData = {
        uid: 'mix_999',
        title: 'Mon Mix LoFi',
        bpm: 90,
        tracks: [{ id: 1, sampleUid: 'samp_123', volume: 0.8, isMuted: false }],
        metadata: { usedSampleUids: ['samp_123'], permissions: { allowShowcase: true, allowRadio: true } }
      };

      vi.mocked(PartitaModel.findOne).mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) } as any);
      vi.mocked(PartitaModel.create).mockResolvedValue([{ ...projectData, slug: 'mon-mix-lofi' }] as any);

      const result = await orchestrator.exportProject(projectData, userSignature as any);

      expect(result.success).toBe(true);
      
      // 👑 CORRECTION ICI : ownerUid au lieu de userUid
      expect(LedgerEntryModel.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'CREDIT', ownerUid: 'bird_artist_1', currency: 'VINYLE' })
        ]),
        expect.any(Object)
      );

      expect(UniversHallBeaconModel.create).toHaveBeenCalled();
      expect(UniversalMediaRegistry.indexItem).toHaveBeenCalled();
    });
  });
});
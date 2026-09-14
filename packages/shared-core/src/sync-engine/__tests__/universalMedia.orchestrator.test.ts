import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversalMediaOrchestrator } from '../universalMedia.orchestrator';
import { UniversalMediaModel, OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    UniversalMediaModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      deleteOne: vi.fn(),
    },
    OiseauModel: {
      findOne: vi.fn(),
    }
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'node_mock' }] }) })),
  },
}));

describe('UniversalMediaOrchestrator - La Forge du Socle Matériel', () => {
  let orchestrator: UniversalMediaOrchestrator;
  const adminSignature = { actorUid: 'admin_1', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_creator', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new UniversalMediaOrchestrator();
    
    // Simule la résolution canonique
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird_creator' })
    } as any);
  });

  describe('fosterMedia (Fondation)', () => {
    it('doit rejeter (404) si l\'Oiseau créateur n\'est pas trouvé dans la Silice', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(
        orchestrator.fosterMedia({ title: { fr: 'Test' } }, userSignature as any)
      ).rejects.toThrow(/Oiseau introuvable/);
    });

    it('doit forger un Asset dans MongoDB et Neo4j via le TransactionManager', async () => {
      const mockMediaData = {
        mediaId: 'media_123',
        type: 'AUDIO_STEM',
        sourceApp: 'DHO',
        title: { fr: 'Onde Brute' },
      };

      vi.mocked(UniversalMediaModel.create).mockResolvedValueOnce([mockMediaData] as any);

      const res = await orchestrator.fosterMedia(mockMediaData, userSignature as any);
      
      expect(res.success).toBe(true);
      expect(res.mongo.mediaId).toBe('media_123');
      expect(UniversalMediaModel.create).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('disintegrateMedia (Désintégration)', () => {
    it('doit rejeter (403) si l\'acteur n\'est ni le créateur ni un Architecte', async () => {
      vi.mocked(UniversalMediaModel.findOne).mockResolvedValueOnce({ 
        mediaId: 'media_123', 
        creatorUid: 'other_bird' 
      } as any);

      await expect(
        orchestrator.disintegrateMedia('media_123', { actorUid: 'intruder', capabilities: [] } as any)
      ).rejects.toThrow(/Seul le créateur ou l'Architecte/);
    });

    it('doit désintégrer le média avec succès si l\'acteur est l\'Architecte', async () => {
      vi.mocked(UniversalMediaModel.findOne).mockResolvedValueOnce({ 
        mediaId: 'media_123', 
        creatorUid: 'bird_creator' 
      } as any);
      
      vi.mocked(UniversalMediaModel.deleteOne).mockResolvedValueOnce({ deletedCount: 1 } as any);

      const res = await orchestrator.disintegrateMedia('media_123', adminSignature as any);
      
      expect(res.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
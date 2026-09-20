import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropagationOrchestrator } from '../propagation.orchestrator';
import { ShareEventModel, SujetModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// ==========================================
// MOCKS INCHIFFRÉS
// ==========================================
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    ShareEventModel: {
      create: vi.fn(),
      findOne: vi.fn(),
    },
    SujetModel: {
      findOne: vi.fn(),
    },
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

// ==========================================
// TESTS : PROPAGATION ORCHESTRATOR
// ==========================================
describe('PropagationOrchestrator - Le Flux du Réseau', () => {
  let orchestrator: PropagationOrchestrator;
  const userSignature = { actorUid: 'oiseau_source', capabilities: [] };

  let mockMongoSession: any;
  let mockNeo4jTx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new PropagationOrchestrator();
    
    mockMongoSession = {};
    mockNeo4jTx = { run: vi.fn() };

    vi.mocked(TransactionManager.execute).mockImplementation(async (_name, cb) => {
      return cb(mockMongoSession, mockNeo4jTx);
    });
  });

  describe('propagateArtifact', () => {
    
    it('🔴 doit rejeter directement (400) un partage TARGETED sans destinataires', async () => {
      const payload = {
        artifactUid: 'oeuvre_1',
        artifactType: 'BLOG' as const,
        scope: 'TARGETED' as const,
        receiverUids: []
      };

      await expect(
        orchestrator.propagateArtifact(payload, userSignature as any)
      ).rejects.toThrow(IlotError);
      
      expect(TransactionManager.execute).not.toHaveBeenCalled();
    });

    it('🟢 doit orchestrer un partage GLOBAL avec succès et mettre à jour le Sujet', async () => {
      const payload = {
        artifactUid: 'oeuvre_1',
        artifactType: 'BLOG' as const,
        scope: 'GLOBAL' as const,
      };

      vi.mocked(ShareEventModel.create).mockResolvedValueOnce([{ uid: 'share_123', scope: 'GLOBAL' }] as any);
      mockNeo4jTx.run.mockResolvedValueOnce({ records: [{}] });

      const mockSujet = {
        uid: 'oeuvre_1',
        propagation: { shareCount: 0, globalReach: 0 },
        save: vi.fn()
      };
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockSujet)
      } as any);

      const res = await orchestrator.propagateArtifact(payload, userSignature as any);

      expect(res.success).toBe(true);
      expect(ShareEventModel.create).toHaveBeenCalled();
      expect(mockNeo4jTx.run).toHaveBeenCalled();
      
      // Vérification de l'impact sur l'œuvre originelle
      expect(mockSujet.propagation.shareCount).toBe(1);
      expect(mockSujet.propagation.globalReach).toBe(10); // Arbitraire pour le test du scope GLOBAL
      expect(mockSujet.save).toHaveBeenCalled();
    });
  });

  describe('thankPasseur (Le Ratio de Retour)', () => {
    
    it('🔴 doit rejeter (400) si l\'Oiseau tente de se remercier lui-même', async () => {
      vi.mocked(ShareEventModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue({ uid: 'share_1', sourceUid: 'oiseau_source' })
      } as any);

      await expect(
        orchestrator.thankPasseur('share_1', userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit incrémenter le merciCount et recalculer le returnRatio avec succès', async () => {
        const mockShareEvent = { 
            uid: 'share_1', 
            sourceUid: 'autre_oiseau', // Pas l'acteur actuel
            metrics: { merciCount: 1, noiseCount: 2, returnRatio: 0.33 },
            save: vi.fn()
        };

        vi.mocked(ShareEventModel.findOne).mockReturnValue({
          session: vi.fn().mockResolvedValue(mockShareEvent)
        } as any);

        // On simule que la relation Neo4j a bien été créée (pas de doublon)
        mockNeo4jTx.run.mockResolvedValueOnce({ records: [{}] });

        const res = await orchestrator.thankPasseur('share_1', userSignature as any);

        expect(res.success).toBe(true);
        expect(mockShareEvent.metrics.merciCount).toBe(2); // 1 -> 2
        // Nouveau ratio : 2 / (2 + 2) = 2/4 = 0.5
        expect(mockShareEvent.metrics.returnRatio).toBe(0.5);
        expect(mockShareEvent.save).toHaveBeenCalled();
    });
  });
});
// packages/shared-core/src/sync-engine/__tests__/resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { syncUniversalInteraction } from '@ilot/infrastructure';

// 🛡️ Mock unifié et sécurisé de l'infrastructure et de Neo4j
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
    },
    syncUniversalInteraction: vi.fn(async () => true),
    getNeo4jSession: vi.fn(() => ({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true)
    })),
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => {
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({ 
          records: [{ 
            get: (field: string) => {
              if (field === 'ownerUid') return 'target_owner_123';
              return {};
            }
          }] 
        }) 
      };
      return await cb({} as any, mockNeo4jTx as any);
    }),
  },
}));


describe('ResonanceOrchestrator - Tissage du Graphe & Scans Stricts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simule la résolution canonique
    vi.mocked(OiseauModel.findOne).mockImplementation(({ $or }: any) => {
      const identifier = $or[0].slug || $or[1].uid || 'unknown';
      return {
        lean: vi.fn().mockResolvedValue({ uid: `resolved_${identifier}` })
      } as any;
    });
  });

  describe('weaveCrossDomainLink', () => {
    it('🔴 doit rejeter (403) si la requête Neo4j échoue à prouver la souveraineté de l\'acteur (0 records retournés)', async () => {
      const restrictedSignature = { actorUid: 'b1', capabilities: [] };
      
      // On simule un refus du graphe
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, { run: vi.fn().mockResolvedValue({ records: [] }) } as any);
      });

      await expect(
        ResonanceOrchestrator.weaveCrossDomainLink('s1', 'Project', 't1', 'Task', 'ILLUMINATES', restrictedSignature as any)
      ).rejects.toThrow(/Échec du tissage : Entités introuvables ou Aura insuffisante/);
    });

    it('🟢 doit tisser un lien transdisciplinaire avec succès en exigeant les UIDs canoniques (Root ou Créateur légitime)', async () => {
      const adminSignature = { actorUid: 'architect_1', capabilities: ['*'] };
      
      const res = await ResonanceOrchestrator.weaveCrossDomainLink(
        'project_canonical_1', 'Project', 'task_canonical_1', 'Task', 'RELATES_TO', adminSignature as any
      );
      
      expect(res.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('addSocialEcho', () => {
    it('🔴 doit rejeter (401) si l\'Oiseau est un acteur fantôme', async () => {
      const ghostSignature = { capabilities: [] };
      await expect(
        ResonanceOrchestrator.addSocialEcho('target-1', 'Partita', 'TEXT', 'Salut', ghostSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit résoudre l\'acteur, ajouter un écho social et propager l\'interaction universelle au créateur', async () => {
      const validSignature = { actorUid: 'bird_slug', capabilities: [] };
      const res = await ResonanceOrchestrator.addSocialEcho(
        'partita-slug', 'Partita', 'TEXT', 'Belle composition !', validSignature as any
      );
      
      expect(res.success).toBe(true);
      expect(res.content).toBe('Belle composition !');
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Vérification du tissage universel (acteur <-> créateur de la Partita)
      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_slug', 'target_owner_123', 'PRAISE');
    });
  });

  describe('weaveResonance & severResonance', () => {
    it('🟢 doit résoudre les oiseaux, tisser une résonance, valider l\'harmonie et propager l\'interaction', async () => {
      // Pour ce test spécifique, on mocke la méthode execute pour simuler un isHarmonic = true
      vi.mocked(TransactionManager.execute).mockResolvedValueOnce(true as any);
      
      const isHarmonic = await ResonanceOrchestrator.weaveResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL' as any
      });

      expect(isHarmonic).toBe(true);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // Tissage universel !
      expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_slug_a', 'resolved_bird_slug_b', 'PRAISE');
    });

    it('🟢 doit résoudre les identités et couper une résonance avec succès', async () => {
      await ResonanceOrchestrator.severResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL' as any
      });

      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
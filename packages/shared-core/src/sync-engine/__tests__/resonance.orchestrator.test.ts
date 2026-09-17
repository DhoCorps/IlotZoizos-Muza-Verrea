import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { ActionSignature, ResonanceType } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ Mock unifié et sécurisé de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    OiseauModel: {},
    getNeo4jSession: vi.fn(() => ({
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(true)
    })),
  };
});

// Mock complet du moteur d'orchestration global
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {}),
  resolveCanonicalUid: vi.fn(async (_model: unknown, identifier?: string) => `resolved_${identifier || 'unknown'}`)
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
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
      return await cb({} as ClientSession, mockNeo4jTx as unknown as Transaction);
    }),
  },
}));

describe('ResonanceOrchestrator - Tissage du Graphe & Scans Stricts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('weaveCrossDomainLink', () => {
    it('🔴 doit rejeter (403) si la requête Neo4j échoue à prouver la souveraineté de l\'acteur (0 records retournés)', async () => {
      const restrictedSignature: ActionSignature = { actorUid: 'b1', capabilities: [] };
      
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name: string, cb: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<unknown>) => {
        return await cb({} as ClientSession, { run: vi.fn().mockResolvedValue({ records: [] }) } as unknown as Transaction);
      });

      await expect(
        ResonanceOrchestrator.weaveCrossDomainLink('s1', 'Project', 't1', 'Task', 'ILLUMINATES', restrictedSignature)
      ).rejects.toThrow(/Échec du tissage : Entités introuvable ou Aura insuffisante/);
    });

    it('🟢 doit tisser un lien transdisciplinaire avec succès en exigeant les UIDs canoniques (Root ou Créateur légitime)', async () => {
      const adminSignature: ActionSignature = { actorUid: 'architect_1', capabilities: ['*'] };
      
      const res = await ResonanceOrchestrator.weaveCrossDomainLink(
        'project_canonical_1', 'Project', 'task_canonical_1', 'Task', 'RELATES_TO', adminSignature
      );
      
      expect(res.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('addSocialEcho', () => {
    it('🔴 doit rejeter (401) si l\'Oiseau est un acteur fantôme', async () => {
      const ghostSignature: ActionSignature = { actorUid: '', capabilities: [] };
      await expect(
        ResonanceOrchestrator.addSocialEcho('target-1', 'Partita', 'TEXT', 'Salut', ghostSignature)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit résoudre l\'acteur, ajouter un écho social et propager l\'interaction universelle au créateur', async () => {
      const validSignature: ActionSignature = { actorUid: 'bird_slug', capabilities: [] };
      const res = await ResonanceOrchestrator.addSocialEcho(
        'partita-slug', 'Partita', 'TEXT', 'Belle composition !', validSignature
      );
      
      expect(res.success).toBe(true);
      expect(res.content).toBe('Belle composition !');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
        'resolved_bird_slug', 
        'target_owner_123', 
        'PRAISE', 
        'addSocialEcho'
      );
    });
  });

  describe('weaveResonance & severResonance', () => {
    it('🟢 doit résoudre les oiseaux, tisser une résonance, valider l\'harmonie et propager l\'interaction', async () => {
      vi.mocked(TransactionManager.execute).mockResolvedValueOnce(true as never);
      
      const isHarmonic = await ResonanceOrchestrator.weaveResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL' as ResonanceType
      });

      expect(isHarmonic).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
      expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
        'resolved_bird_slug_a', 
        'resolved_bird_slug_b', 
        'PRAISE', 
        'weaveResonance'
      );
    });

    it('🟢 doit résoudre les identités et couper une résonance avec succès', async () => {
      await ResonanceOrchestrator.severResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL' as ResonanceType
      });

      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
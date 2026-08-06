import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { ResonanceType } from '@ilot/types';

// ==========================================
// MOCKS DU SANCTUAIRE
// ==========================================
const mockRun = vi.fn();
const mockClose = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(() => ({
    run: mockRun,
    close: mockClose
  }))
}));

// Mock du TransactionManager pour isoler Neo4j et s'affranchir de MongoDB dans ces tests unitaires
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name: string, callback: any) => {
      const fakeNeo4jTx = { run: mockRun };
      return callback({}, fakeNeo4jTx);
    })
  }
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
    default: {
      randomUUID: vi.fn(() => 'mock-uuid-1234')
    }
  };
});

describe('ResonanceOrchestrator - Le Tisseur du Graphe Neo4j', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // 1. ANCIENS SYSTÈMES : MAILLAGE ET ÉCHOS
  // ==========================================
  describe('Maillage Transdisciplinaire (weaveCrossDomainLink)', () => {
    it('🔴 doit rejeter le tissage si l’Aura de l’acteur est insuffisante (403)', async () => {
      const signature = { actorUid: 'bird_1', capabilities: ['MEMBER'] };
      
      await expect(
        ResonanceOrchestrator.weaveCrossDomainLink('src_1', 'Project', 'tgt_1', 'Task', 'ILLUMINATES', signature)
      ).rejects.toThrow("Aura insuffisante");
    });

    it('🟢 doit tisser le pont entre deux entités si l’acteur a les droits système (*)', async () => {
      const signature = { actorUid: 'admin_bird', capabilities: ['*'] };
      mockRun.mockResolvedValueOnce({ records: [{ get: () => 'r' }] }); // Simule un retour Neo4j valide

      const result = await ResonanceOrchestrator.weaveCrossDomainLink('src_1', 'Project', 'tgt_1', 'Task', 'ILLUMINATES', signature);
      
      expect(result.success).toBe(true);
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (source)-[r:ILLUMINATES]->(target)'),
        expect.objectContaining({ sourceUid: 'src_1', targetUid: 'tgt_1', actorUid: 'admin_bird' })
      );
    });
  });

  describe('Échos Sociaux (addSocialEcho)', () => {
    it('🟢 doit créer un écho textuel dans Neo4j (ECHOES)', async () => {
      const signature = { actorUid: 'bird_1', capabilities: ['MEMBER'] };
      mockRun.mockResolvedValueOnce({ records: [{}] });

      const result = await ResonanceOrchestrator.addSocialEcho('post_1', 'Sujet', 'TEXT', 'Super sujet !', signature);
      
      expect(result.success).toBe(true);
      expect(result.echoUid).toBe('echo_mock-uuid-1234');
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('CREATE (u)-[r:ECHOES'),
        expect.objectContaining({ content: 'Super sujet !', echoUid: 'echo_mock-uuid-1234' })
      );
    });
  });

  describe('Radar et Transversalité (getResonances & findTransversalResonances)', () => {
    it('🟢 doit formater et renvoyer les connexions directes d’un nœud', async () => {
      mockRun.mockResolvedValueOnce({
        records: [
          { get: (key: string) => key === 'relationType' ? 'INSPIRED_BY' : key === 'neighborType' ? 'Project' : key === 'neighborUid' ? 'proj_1' : 'Nom Projet' }
        ]
      });

      const results = await ResonanceOrchestrator.getResonances('task_1');
      
      expect(results).toHaveLength(1);
      expect(results[0].relation).toBe('INSPIRED_BY');
      expect(results[0].title).toBe('Nom Projet');
      expect(mockClose).toHaveBeenCalled();
    });

    it('🟢 doit renvoyer les résonances transversales (Oiseaux partageant les mêmes tags)', async () => {
      mockRun.mockResolvedValueOnce({
        records: [
          { get: (key: string) => key === 'peerUid' ? 'bird_2' : key === 'sharedTags' ? ['Code', 'Music'] : { toNumber: () => 3 } }
        ]
      });

      const results = await ResonanceOrchestrator.findTransversalResonances('bird_1');
      
      expect(results).toHaveLength(1);
      expect(results[0].peerUid).toBe('bird_2');
      expect(results[0].score).toBe(6);
    });
  });

  // ==========================================
  // 2. NOUVEAUX SYSTÈMES : ABONNEMENTS GRANULAIRES
  // ==========================================
  describe('Abonnements Granulaires (weaveResonance)', () => {
    it('🟢 doit créer un abonnement granulaire (SPECIFIC) sans déclencher l’Harmonie', async () => {
      mockRun.mockResolvedValueOnce({ records: [{}] });

      const payload = { sourceUid: 'bird_A', targetUid: 'bird_B', type: 'FOLLOWS_SPECIFIC' as ResonanceType, entityId: 'proj_X' };
      const isHarmonic = await ResonanceOrchestrator.weaveResonance(payload);

      expect(isHarmonic).toBe(false);
      expect(mockRun).toHaveBeenCalledTimes(1); 
      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('MERGE (source)-[r:RESONATES_WITH { entityId: $entityId, type: $type }]->(target)'),
        expect.objectContaining({ type: 'FOLLOWS_SPECIFIC', entityId: 'proj_X' })
      );
    });

    it('🟢 doit créer un abonnement GLOBAL et détecter l’Harmonie si le suivi est mutuel', async () => {
      mockRun.mockResolvedValueOnce({ records: [{}] });
      mockRun.mockResolvedValueOnce({ records: [{}] });

      const payload = { sourceUid: 'bird_A', targetUid: 'bird_B', type: 'FOLLOWS_GLOBAL' as ResonanceType };
      const isHarmonic = await ResonanceOrchestrator.weaveResonance(payload);

      expect(isHarmonic).toBe(true);
      expect(mockRun).toHaveBeenCalledTimes(2);
    });

    it('🟢 doit créer un abonnement GLOBAL sans Harmonie si le suivi n’est pas mutuel', async () => {
      mockRun.mockResolvedValueOnce({ records: [{}] });
      mockRun.mockResolvedValueOnce({ records: [] });

      const payload = { sourceUid: 'bird_A', targetUid: 'bird_B', type: 'FOLLOWS_GLOBAL' as ResonanceType };
      const isHarmonic = await ResonanceOrchestrator.weaveResonance(payload);

      expect(isHarmonic).toBe(false);
    });
  });

  describe('Désabonnements (severResonance)', () => {
    it('🟢 doit détruire le fil de résonance et l’Harmonie associée', async () => {
      mockRun.mockResolvedValueOnce({ records: [] });

      const payload = { sourceUid: 'bird_A', targetUid: 'bird_B', type: 'FOLLOWS_GLOBAL' as ResonanceType };
      await ResonanceOrchestrator.severResonance(payload);

      expect(mockRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE r'),
        expect.objectContaining({ sourceUid: 'bird_A', targetUid: 'bird_B', type: 'FOLLOWS_GLOBAL' })
      );
    });
  });
});
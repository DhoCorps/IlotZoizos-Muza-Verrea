// packages/shared-core/src/sync-engine/__test__/resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';


vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({} as any, { run: vi.fn().mockResolvedValue({ records: [{ get: () => ({}) }] }) })),
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(() => ({
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(true)
  }))
}));

describe('ResonanceOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('weaveCrossDomainLink', () => {
    it('🔴 doit rejeter (403) si l’Oiseau n’a pas la capacité requise', async () => {
      const restrictedSignature = { actorUid: 'b1', capabilities: [] };

      await expect(
        ResonanceOrchestrator.weaveCrossDomainLink('s1', 'Project', 't1', 'Task', 'ILLUMINATES', restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit tisser un lien transdisciplinaire avec succès si l’aura est suffisante', async () => {
      const adminSignature = { actorUid: 'architect_1', capabilities: ['*'] };

      const res = await ResonanceOrchestrator.weaveCrossDomainLink(
        'project-1', 'Project', 'task-1', 'Task', 'ILLUMINATES', adminSignature as any
      );

      expect(res.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('addSocialEcho', () => {
    it('🔴 doit rejeter (401) si l’Oiseau est un acteur fantôme', async () => {
      const ghostSignature = { capabilities: [] };

      await expect(
        ResonanceOrchestrator.addSocialEcho('target-1', 'Partita', 'TEXT', 'Salut', ghostSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit ajouter un écho social (texte) avec succès', async () => {
      const validSignature = { actorUid: 'bird_alpha', capabilities: [] };

      const res = await ResonanceOrchestrator.addSocialEcho(
        'partita-slug', 'Partita', 'TEXT', 'Belle composition !', validSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.content).toBe('Belle composition !');
      expect(res.type).toBe('TEXT');
    });
  });

  describe('weaveResonance & severResonance', () => {
    it('🟢 doit tisser une résonance et valider l’harmonie mutuelle', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [] }) // Merge RESONATES_WITH
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // Harmony check
      };

      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, mockNeo4jTx as any);
      });

      const isHarmonic = await ResonanceOrchestrator.weaveResonance({
        sourceUid: 'bird_a',
        targetUid: 'bird_b',
        type: 'FOLLOWS_GLOBAL'
      });

      expect(isHarmonic).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit couper une résonance avec succès', async () => {
      await ResonanceOrchestrator.severResonance({
        sourceUid: 'bird_a',
        targetUid: 'bird_b',
        type: 'FOLLOWS_GLOBAL'
      });

      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
// packages/shared-core/src/sync-engine/__test__/resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResonanceOrchestrator } from '../resonance.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

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

describe('ResonanceOrchestrator - Tissage du Graphe & Scans Stricts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Simule la résolution canonique
    vi.mocked(OiseauModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ uid: 'bird_canonical_uid' })
    } as any);
  });

  describe('weaveCrossDomainLink', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'a pas la capacité requise', async () => {
      const restrictedSignature = { actorUid: 'b1', capabilities: [] };
      await expect(
        ResonanceOrchestrator.weaveCrossDomainLink('s1', 'Project', 't1', 'Task', 'ILLUMINATES', restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit tisser un lien transdisciplinaire avec succès en exigeant les UIDs canoniques', async () => {
      const adminSignature = { actorUid: 'architect_1', capabilities: ['*'] };
      const res = await ResonanceOrchestrator.weaveCrossDomainLink(
        'project_canonical_1', 'Project', 'task_canonical_1', 'Task', 'ILLUMINATES', adminSignature as any
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

    it('🟢 doit résoudre l\'acteur via la Silice et ajouter un écho social (texte) avec succès', async () => {
      const validSignature = { actorUid: 'bird_slug', capabilities: [] };
      const res = await ResonanceOrchestrator.addSocialEcho(
        'partita-slug', 'Partita', 'TEXT', 'Belle composition !', validSignature as any
      );
      
      expect(res.success).toBe(true);
      expect(res.content).toBe('Belle composition !');
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(1); // Résolution Silice appelée !
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('weaveResonance & severResonance', () => {
    it('🟢 doit résoudre les deux oiseaux, tisser une résonance et valider l\'harmonie mutuelle', async () => {
      const mockNeo4jTx = {
        run: vi.fn()
          .mockResolvedValueOnce({ records: [] }) // Merge RESONATES_WITH
          .mockResolvedValueOnce({ records: [{ get: () => ({}) }] }) // Harmony check
      };
      
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (name, cb) => {
        return await cb({} as any, mockNeo4jTx as any);
      });

      const isHarmonic = await ResonanceOrchestrator.weaveResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL'
      });

      expect(isHarmonic).toBe(true);
      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2); // Les deux oiseaux résolus
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit résoudre les identités et couper une résonance avec succès', async () => {
      await ResonanceOrchestrator.severResonance({
        sourceUid: 'bird_slug_a',
        targetUid: 'bird_slug_b',
        type: 'FOLLOWS_GLOBAL'
      });

      expect(OiseauModel.findOne).toHaveBeenCalledTimes(2); // Résolution ok
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
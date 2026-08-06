// packages/shared-core/src/sync-engine/__test__/sovereign.purge.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SovereignPurgeOrchestrator } from '../sovereign.purge.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { ProjectModel } from '../../../../infrastructure/src/database/models/nosql/project.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
  TaskModel: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
  ProjectModel: {
    deleteMany: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb({} as any, { 
      run: vi.fn().mockResolvedValue({ records: [{ get: () => ({ toNumber: () => 1 }) }] }) 
    })),
  },
}));

describe('SovereignPurgeOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateDissolution & buildPurgePayload', () => {
    it('🟢 doit évaluer correctement le seuil de dissolution', () => {
      expect(SovereignPurgeOrchestrator.evaluateDissolution(-15, -10)).toBe(true);
      expect(SovereignPurgeOrchestrator.evaluateDissolution(-5, -10)).toBe(false);
    });

    it('🟢 doit construire le payload de purge attendu', () => {
      const payload = SovereignPurgeOrchestrator.buildPurgePayload({ entityId: 'bird_1', reason: 'VOLUNTARY_EXILE' });
      expect(payload.targetUid).toBe('bird_1');
      expect(payload.action).toBe('PURGE_COMPLETE');
    });
  });

  describe('executeSovereignPurge', () => {
    it('🔴 doit rejeter (403) si l’acteur n’est ni l’entité elle-même ni root (*)', async () => {
      const orchestrator = new SovereignPurgeOrchestrator();
      const unauthorizedSignature = { actorUid: 'other_bird', capabilities: [] };

      await expect(
        orchestrator.executeSovereignPurge({ entityId: 'bird_1', reason: 'VITAL_COLLAPSE' }, unauthorizedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit exécuter la purge souveraine avec succès si l’acteur est l’entité elle-même', async () => {
      const orchestrator = new SovereignPurgeOrchestrator();
      const selfSignature = { actorUid: 'bird_1', capabilities: [] };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValueOnce({ uid: 'bird_1', slug: 'bird-slug' })
      } as any);

      const res = await orchestrator.executeSovereignPurge(
        { entityId: 'bird_1', reason: 'VOLUNTARY_EXILE' }, 
        selfSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.neo4jDeletedCount).toBe(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
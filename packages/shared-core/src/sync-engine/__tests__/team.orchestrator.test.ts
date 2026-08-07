// packages/shared-core/src/sync-engine/__test__/team.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { TeamModel, OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

vi.mock('@ilot/infrastructure', () => ({
  TeamModel: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, cb) => cb('mock-mongo-session', { run: vi.fn().mockResolvedValue({ records: [] }) })),
  },
}));

describe('TeamOrchestrator', () => {
  let orchestrator: TeamOrchestrator;
  const adminSignature = { actorUid: 'bird_owner', capabilities: [CAPABILITIES.TEAM.CREATE, CAPABILITIES.TEAM.DELETE, CAPABILITIES.TEAM.UPDATE] };
  const restrictedSignature = { actorUid: 'bird_stranger', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TeamOrchestrator();
  });

  describe('fosterTeam', () => {
    it('🔴 doit rejeter (403) si l’Oiseau n’a pas la capacité de fonder une escouade', async () => {
      await expect(
        orchestrator.fosterTeam({ name: 'Nid Test', category: 'DEV', isPrivate: false, ownerUid: 'u1', leaderUid: null }, restrictedSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit fonder un Nid dans la Silice et Neo4j avec succès', async () => {
      vi.mocked(OiseauModel.findOne).mockResolvedValueOnce({ uid: 'bird_owner' } as any);
      vi.mocked(TeamModel.create).mockResolvedValueOnce([{ _id: 'mongo_id', uid: 'team_1', name: 'Nid Test' }] as any);

      const res = await orchestrator.fosterTeam(
        { name: 'Nid Test', category: 'DEV', isPrivate: false, ownerUid: 'bird_owner', leaderUid: null },
        adminSignature as any
      );

      expect(res.success).toBe(true);
      expect(res.mongo.uid).toBe('team_1');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('leaveTeam', () => {
    it('🔴 doit rejeter (403) si l’acteur tente de forcer le départ d’un autre oiseau', async () => {
      await expect(
        orchestrator.leaveTeam('team_1', 'other_user', 'CLEAN', adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🔴 doit rejeter (400) si l’architecte/owner tente d’abandonner son propre Nid', async () => {
      const selfSig = { actorUid: 'bird_owner', capabilities: [] };
      vi.mocked(TeamModel.findOne).mockResolvedValueOnce({ uid: 'team_1', ownerUid: 'bird_owner' } as any);

      await expect(
        orchestrator.leaveTeam('team_1', 'bird_owner', 'CLEAN', selfSig as any)
      ).rejects.toThrow(IlotError);
    });
  });
});
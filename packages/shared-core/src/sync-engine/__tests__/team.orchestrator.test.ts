// packages/shared-core/src/sync-engine/__tests__/team.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { TransactionManager } from '../transactionManager';

// 🛡️ SUTURE 1 : Alignement sur les alias pour bloquer la Silice
vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn().mockResolvedValue({ uid: 'bird-999', isOpenToInvitations: true }),
    findOneAndUpdate: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/team.model', () => ({
  TeamModel: {
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    // 🪡 SUTURE : Injection de findOne pour éteindre le crash "TeamModel.findOne is not a function"
    findOne: vi.fn().mockResolvedValue({ uid: 'nest-789', ownerUid: 'bird-inviter-001' }),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn()
  }
}));

// 🛡️ SUTURE 2 : Mock du TransactionManager (Le Squelette d'Acier) [cite: 2026-02-11]
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo = { records: [] };
      const result = await callback(null as any, { run: vi.fn().mockResolvedValue(mockNeo) } as any);
      // On enveloppe le résultat pour correspondre au TeamSyncResult
      return {
        success: true,
        status: 'success',
        mongo: result?.mongo || result,
        neo4j: mockNeo
      };
    })
  }
}));

describe('TeamOrchestrator - Gestion du Nid', () => {
  let orchestrator: TeamOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new TeamOrchestrator();
  });

  it('✅ doit permettre l\'invitation si la Signature possède MEMBER.INVITE', async () => {
    const validSignature: ActionSignature = {
      actorUid: 'bird-inviter-001',
      capabilities: [CAPABILITIES.MEMBER.INVITE]
    };

    const invitation = await orchestrator.inviteBird({
      teamUid: 'nest-789',
      targetUserUid: 'bird-999'
    }, validSignature);

    expect(invitation.success).toBe(true);
    expect(TransactionManager.execute).toHaveBeenCalledWith("Invitation d'Oiseau", expect.any(Function));
  });

  it('❌ doit rejeter l\'invitation si la Signature est faible', async () => {
    const badSignature: ActionSignature = { actorUid: 'bird-curieux', capabilities: [] };

    await expect(
      orchestrator.inviteBird({ teamUid: 'nest-789', targetUserUid: 'bird-999' }, badSignature)
    ).rejects.toThrow(/Aura insuffisante/);
  });
});
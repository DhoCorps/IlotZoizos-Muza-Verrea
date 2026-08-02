// packages/shared-core/src/sync-engine/__tests__/team.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { TransactionManager } from '../transactionManager';
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';


vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>();
  return {
    ...actual,
    Schema: actual.Schema || class MockSchema {}, // 🪡 S'assure que Schema existe
  };
});
// 🛡️ SUTURE 1 : Mock des modèles Silice (MongoDB)
// On utilise des objets JS purs (POJO) pour éviter l'hydratation Mongoose (et les erreurs FlattenMaps)
vi.mock('@ilot/infrastructure/src/database/models/nosql/user.model', () => ({
  OiseauModel: {
    findOne: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ uid: 'bird-999', pseudo: 'AlphaBird', frequenceHEX: '#000000', capabilities: [] })
    })),
    findOneAndUpdate: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('@ilot/infrastructure/src/database/models/nosql/team.model', () => ({
  TeamModel: {
    create: vi.fn().mockImplementation((data) => Promise.resolve(Array.isArray(data) ? data : [data])),
    findOne: vi.fn().mockImplementation(() => ({
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ uid: 'nest-789', ownerUid: 'bird-inviter-001' })
    })),
    findOneAndUpdate: vi.fn().mockImplementation(() => ({
      lean: vi.fn().mockResolvedValue({ uid: 'nest-789', name: 'Nid Muté' })
    })),
    findOneAndDelete: vi.fn()
  }
}));

// 🛡️ SUTURE 2 : Mock du TransactionManager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn().mockImplementation(async (name, callback) => {
      const mockNeo = { records: [] };
      const result = await callback({} as any, { run: vi.fn().mockResolvedValue(mockNeo) } as any);
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

  it('✅ doit fonder une escouade si la signature possède CAPABILITIES.TEAM.CREATE', async () => {
    const validSignature: ActionSignature = {
      actorUid: 'bird-inviter-001',
      capabilities: [CAPABILITIES.TEAM.CREATE]
    };

    const teamData = {
      name: 'Nid Expérimental',
      category: 'SOCIAL',
      isPrivate: true,
      ownerUid: 'bird-inviter-001',
      leaderUid: 'bird-inviter-001'
    };

    const result = await orchestrator.fosterTeam(teamData as any, validSignature);

    expect(result.success).toBe(true);
    expect(TransactionManager.execute).toHaveBeenCalledWith("Fondation d'Escouade", expect.any(Function));
  });

  it('❌ doit rejeter la fondation si l\'Aura est absente', async () => {
    const badSignature: ActionSignature = { actorUid: 'bird-curieux', capabilities: [] };
    const teamData = { name: 'Nid Interdit', category: 'SOCIAL', isPrivate: true, ownerUid: 'bird-curieux' };

    await expect(
      orchestrator.fosterTeam(teamData as any, badSignature)
    ).rejects.toThrow("Aura insuffisante");
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

  it('❌ doit rejeter l\'invitation si la signature ne possède pas les droits', async () => {
    const badSignature: ActionSignature = { actorUid: 'bird-inconnu', capabilities: [] };

    await expect(
      orchestrator.inviteBird({ teamUid: 'nest-789', targetUserUid: 'bird-999' }, badSignature)
    ).rejects.toThrow("Aura insuffisante");
  });
});
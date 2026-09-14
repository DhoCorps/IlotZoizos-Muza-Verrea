// packages/shared-core/src/sync-engine/__tests__/team.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { OiseauModel, TeamModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { syncUniversalInteraction } from '@ilot/infrastructure';

// 🛡️ Mock unifié et sécurisé de l'infrastructure pour l'équipe, les projets, les tâches et le tissage
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateMany: vi.fn(),
    },
    TeamModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
    ProjectModel: {
      find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
      deleteMany: vi.fn(),
    },
    TaskModel: {
      find: vi.fn().mockReturnValue({ session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
      deleteMany: vi.fn(),
    },
    syncUniversalInteraction: vi.fn(async () => true),
  };
});

vi.mock('../../integrity/moral.checker', () => {
    return {
        MoralChecker: class {
            analyze = vi.fn().mockReturnValue({ isSafe: true, suggestion: '' });
        }
    };
});

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn(async (_name, callback) => {
            const mockSession = {};
            const mockNeo4jTx = {
                run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_id' }] })
            };
            return await callback(mockSession, mockNeo4jTx);
        }),
    },
}));

describe('TeamOrchestrator (Synchronisation Mongo/Neo4j pour les Nids - Phase 2)', () => {
    let orchestrator: TeamOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new TeamOrchestrator();

        // Simulation dynamique pour différencier les UIDs lors des appels à resolveCanonicalUid
        vi.mocked(OiseauModel.findOne).mockImplementation(({ $or }: any) => {
            const identifier = $or ? ($or[0].slug || $or[1].uid || 'unknown') : 'default';
            return {
                lean: vi.fn().mockResolvedValue({ uid: `resolved_${identifier}` }),
                uid: `resolved_${identifier}` // Pour la version non-lean
            } as any;
        });
    });

    describe('fosterTeam', () => {
        it('🟢 doit fonder un nid avec succès après résolution canonique', async () => {
            vi.mocked(TeamModel.create).mockResolvedValueOnce([{ uid: 'team_new_123', name: 'Canopée Studio' }] as any);
            
            const payload = {
                name: 'Canopée Studio',
                category: 'SOCIAL',
                isPrivate: false,
                ownerUid: 'bird_creator_1',
                leaderUid: 'bird_creator_1',
            };
            const signature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const result = await orchestrator.fosterTeam(payload, signature as any);
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('uid');
            expect(result.uid).toContain('team_');
            expect(OiseauModel.findOne).toHaveBeenCalled();
            expect(TeamModel.create).toHaveBeenCalled();
        });
    });

    describe('mutateTeam', () => {
        it('🟢 doit muter un nid existant et retourner l\'uid dans l\'objet de résultat', async () => {
            vi.mocked(TeamModel.findOne).mockResolvedValueOnce({ uid: 'team_123', name: 'Ancien Nom' } as any);
            vi.mocked(TeamModel.findOneAndUpdate).mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce({ uid: 'team_123', name: 'Nouveau Nom', frequency: '#2A3B4C', isPrivate: false })
            } as any);

            const signature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const result = await orchestrator.mutateTeam('team_123', { name: 'Nouveau Nom' }, signature as any);
            expect(result.success).toBe(true);
            expect(result.uid).toBe('team_123');
            expect(TeamModel.findOneAndUpdate).toHaveBeenCalled();
        });
    });

    describe('inviteBird', () => {
        it('🟢 doit inviter un oiseau et propager l\'interaction universelle au niveau de la Team', async () => {
            // L'acteur et la team
            vi.mocked(TeamModel.findOne).mockResolvedValueOnce({ uid: 'team_123', ownerUid: 'resolved_bird_creator' } as any);

            const signature = {
                actorUid: 'bird_creator',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const data = {
                teamUid: 'team_123',
                targetUserUid: 'bird_target',
            };

            const result = await orchestrator.inviteBird(data, signature as any);

            expect(result.success).toBe(true);
            expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

            // Vérification du tissage universel (actorUid !== targetUid)
            expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
            expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_creator', 'resolved_bird_target', 'TEAM');
        });
    });
});
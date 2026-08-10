import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { OiseauModel, TeamModel } from '@ilot/infrastructure';
import { MoralChecker } from '../../integrity/moral.checker';

// 🪄 Mocks globaux persistants pour contourner clearMocks
vi.mock('@ilot/infrastructure', () => ({
    OiseauModel: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
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
}));

// 🛡️ Correction du mock de la classe MoralChecker avec prototype fonctionnel
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

describe('TeamOrchestrator (Synchronisation Mongo/Neo4j pour les Nids)', () => {
    let orchestrator: TeamOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new TeamOrchestrator();
    });

    describe('fosterTeam', () => {
        it('🟢 doit fonder un nid et retourner un objet avec la propriété uid', async () => {
            vi.mocked(OiseauModel.findOne).mockResolvedValueOnce({ uid: 'bird_creator_1' } as any);
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

            const result = await orchestrator.fosterTeam(payload, signature);

            expect(result.success).toBe(true);
            expect(result).toHaveProperty('uid');
            expect(result.uid).toContain('team_');
            expect(TeamModel.create).toHaveBeenCalled();
        });
    });

    describe('mutateTeam', () => {
        it('🟢 doit muter un nid existant et retourner l uid dans l objet de résultat', async () => {
            vi.mocked(TeamModel.findOne).mockResolvedValueOnce({ uid: 'team_123', name: 'Ancien Nom' } as any);
            vi.mocked(TeamModel.findOneAndUpdate).mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce({ uid: 'team_123', name: 'Nouveau Nom', frequency: '#2A3B4C', isPrivate: false })
            } as any);

            const signature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const result = await orchestrator.mutateTeam('team_123', { name: 'Nouveau Nom' }, signature);

            expect(result.success).toBe(true);
            expect(result.uid).toBe('team_123');
            expect(TeamModel.findOneAndUpdate).toHaveBeenCalled();
        });
    });
});
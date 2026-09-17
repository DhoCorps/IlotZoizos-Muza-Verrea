import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { OiseauModel, TeamModel, ProjectModel, TaskModel, findEntityBySlugOrUid, syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';

// 🛡️ Mock unifié et sécurisé incluant le chaînage Mongoose complet, les curseurs et la DLQ
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      findOneAndUpdate: vi.fn(),
      updateMany: vi.fn(),
    },
    TeamModel: {
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
    ProjectModel: {
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'proj_123' }]),
        cursor: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] };
          }
        })
      }),
      deleteMany: vi.fn(),
    },
    TaskModel: {
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
        cursor: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] };
          }
        })
      }),
      deleteMany: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
    syncUniversalInteraction: vi.fn(async () => true),
    SystemGraphDlqModel: {
      create: vi.fn().mockResolvedValue([{}])
    }
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
    const mockStorageManager = {
        extractKeyFromUrl: vi.fn((url) => `key_${url}`),
        deleteFile: vi.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new TeamOrchestrator(mockStorageManager);

        // Assurez-vous que ProjectModel.find retourne bien l'objet chaînable à chaque appel
        vi.mocked(ProjectModel.find).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            session: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([{ uid: 'proj_123' }]),
            cursor: vi.fn().mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] };
                }
            })
        } as any);

        vi.mocked(TaskModel.find).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            session: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([]),
            cursor: vi.fn().mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] };
                }
            })
        } as any);

        vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
            const clean = identifier || 'unknown';
            return { uid: `resolved_${clean}`, ownerUid: `resolved_${clean}` } as any;
        });
    });

    describe('fosterTeam', () => {
        it('🟢 doit fonder un nid avec succès après résolution canonique via findEntityBySlugOrUid', async () => {
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
            expect(findEntityBySlugOrUid).toHaveBeenCalled();
            expect(TeamModel.create).toHaveBeenCalled();
        });
    });

    describe('mutateTeam', () => {
        it('🟢 doit muter un nid existant et retourner l\'uid dans l\'objet de résultat', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'team_123', name: 'Ancien Nom' } as any);
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

    describe('dissolveTeam', () => {
        it('🟢 doit dissoudre le nid en utilisant des curseurs Mongoose pour purger le stockage sans saturer la RAM', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'team_123' } as any);
            vi.mocked(TeamModel.findOneAndDelete).mockResolvedValueOnce({ _id: 'mongo_id_123' } as any);

            const signature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const success = await orchestrator.dissolveTeam('team_123', signature as any);
            expect(success).toBe(true);
            expect(ProjectModel.find).toHaveBeenCalled();
            expect(TaskModel.find).toHaveBeenCalled();
            expect(mockStorageManager.deleteFile).toHaveBeenCalled();
        });
    });

    describe('inviteBird', () => {
        it('🟢 doit inviter un oiseau et propager l\'interaction universelle au niveau de la Team', async () => {
            vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
                if (identifier === 'team_123') {
                    return { uid: 'team_123', ownerUid: 'resolved_bird_creator' } as any;
                }
                return { uid: `resolved_${identifier}` } as any;
            });

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

            expect(syncUniversalInteraction).toHaveBeenCalledTimes(1);
            expect(syncUniversalInteraction).toHaveBeenCalledWith('resolved_bird_creator', 'resolved_bird_target', 'TEAM');
        });

        it('🟡 doit basculer l\'interaction en DLQ si syncUniversalInteraction échoue sur inviteBird', async () => {
            vi.mocked(syncUniversalInteraction).mockRejectedValueOnce(new Error('Neo4j failure'));

            vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model, identifier: any) => {
                if (identifier === 'team_123') {
                    return { uid: 'team_123', ownerUid: 'resolved_bird_creator' } as any;
                }
                return { uid: `resolved_${identifier}` } as any;
            });

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
            expect(SystemGraphDlqModel.create).toHaveBeenCalledTimes(1);
        });
    });
});
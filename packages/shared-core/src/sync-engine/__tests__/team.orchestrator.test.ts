import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamOrchestrator } from '../team.orchestrator';
import { OiseauModel, TeamModel, ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { ActionSignature } from '@ilot/types';
import * as orchestratorEngine from '../../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// 🛡️ Mock unifié et sécurisé incluant le chaînage Mongoose complet, les curseurs et la DLQ
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
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
  };
});

// Mock complet du moteur d'orchestration global (incluant safeSyncUniversalInteraction et resolveCanonicalUid)
vi.mock('../../utils/orchestrator.engine', () => ({
  safeSyncUniversalInteraction: vi.fn(async () => {}),
  resolveCanonicalUid: vi.fn(async (_model: unknown, identifier?: string) => `resolved_${identifier || 'unknown'}`)
}));

vi.mock('../../integrity/moral.checker', () => {
    return {
      MoralChecker: class {
          analyze = vi.fn().mockReturnValue({ isSafe: true, suggestion: '' });
      }
    };
});

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn(async (_name: string, callback: (session: ClientSession, tx: Transaction) => Promise<unknown>) => {
            const mockSession = {} as ClientSession;
            const mockNeo4jTx = {
                run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_id' }] })
            };
            return await callback(mockSession, mockNeo4jTx as unknown as Transaction);
        }),
    },
}));

describe('TeamOrchestrator (Synchronisation Mongo/Neo4j pour les Nids - Phase 2)', () => {
    let orchestrator: TeamOrchestrator;
    const mockStorageManager = {
        extractKeyFromUrl: vi.fn((url: string) => `key_${url}`),
        deleteFile: vi.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new TeamOrchestrator(mockStorageManager);

        vi.mocked(ProjectModel.find).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            session: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([{ uid: 'proj_123' }]),
            cursor: vi.fn().mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { uid: 'proj_123', documents: [{ url: 'http://cdn/proj.png' }] };
                }
            })
        } as never);

        vi.mocked(TaskModel.find).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            session: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([]),
            cursor: vi.fn().mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { uid: 'task_1', documents: [{ url: 'http://cdn/task.pdf' }] };
                }
            })
        } as never);

        vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model: unknown, identifier?: string) => {
            const clean = identifier || 'unknown';
            return { uid: `resolved_${clean}`, ownerUid: `resolved_${clean}` } as never;
        });
    });

    describe('fosterTeam', () => {
        it('🟢 doit fonder un nid avec succès après résolution canonique via findEntityBySlugOrUid', async () => {
            vi.mocked(TeamModel.create).mockResolvedValueOnce([{ uid: 'team_new_123', name: 'Canopée Studio' }] as never);
            
            const payload = {
                name: 'Canopée Studio',
                category: 'SOCIAL',
                isPrivate: false,
                ownerUid: 'bird_creator_1',
                leaderUid: 'bird_creator_1',
            };
            const signature: ActionSignature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const result = await orchestrator.fosterTeam(payload, signature);
            expect(result.success).toBe(true);
            expect(result).toHaveProperty('uid');
            expect(result.uid).toContain('team_');
            expect(findEntityBySlugOrUid).toHaveBeenCalled();
            expect(TeamModel.create).toHaveBeenCalled();
        });
    });

    describe('mutateTeam', () => {
        it('🟢 doit muter un nid existant et retourner l\'uid dans l\'objet de résultat', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'team_123', name: 'Ancien Nom' } as never);
            vi.mocked(TeamModel.findOneAndUpdate).mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce({ uid: 'team_123', name: 'Nouveau Nom', frequency: '#2A3B4C', isPrivate: false })
            } as never);

            const signature: ActionSignature = {
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

    describe('dissolveTeam', () => {
        it('🟢 doit dissoudre le nid en utilisant des curseurs Mongoose pour purger le stockage sans saturer la RAM', async () => {
            vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'team_123' } as never);
            vi.mocked(TeamModel.findOneAndDelete).mockResolvedValueOnce({ _id: 'mongo_id_123' } as never);

            const signature: ActionSignature = {
                actorUid: 'bird_creator_1',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const success = await orchestrator.dissolveTeam('team_123', signature);
            expect(success).toBe(true);
            expect(ProjectModel.find).toHaveBeenCalled();
            expect(TaskModel.find).toHaveBeenCalled();
            expect(mockStorageManager.deleteFile).toHaveBeenCalled();
        });
    });

    describe('inviteBird', () => {
        it('🟢 doit inviter un oiseau et propager l\'interaction universelle au niveau de la Team', async () => {
            vi.mocked(findEntityBySlugOrUid).mockImplementation(async (_model: unknown, identifier?: string) => {
                if (identifier === 'team_123') {
                    return { uid: 'team_123', ownerUid: 'resolved_bird_creator' } as never;
                }
                return { uid: `resolved_${identifier}` } as never;
            });

            const signature: ActionSignature = {
                actorUid: 'bird_creator',
                capabilities: ['*'],
                issuedAt: new Date(),
            };

            const data = {
                teamUid: 'team_123',
                targetUserUid: 'bird_target',
            };

            const result = await orchestrator.inviteBird(data, signature);

            expect(result.success).toBe(true);
            expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

            expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledTimes(1);
            expect(orchestratorEngine.safeSyncUniversalInteraction).toHaveBeenCalledWith(
                'resolved_bird_creator', 
                'resolved_bird_target', 
                'TEAM',
                'inviteBird'
            );
        });
    });
});
// packages/shared-core/src/sync-engine/__tests__/task.irrigation.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskIrrigationOrchestrator, TaskPayload } from '../task.irrigation.orchestrator';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// Mocks de Mongoose et du TransactionManager
vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
    TaskModel: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn()
    }
}));

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn()
    }
}));

describe('TaskIrrigationOrchestrator - La Loi de l’Irrigation', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('evaluateAndSanitize', () => {
        it('🌱 doit laisser le flux actif si toutes les dépendances sont saines (It > 0)', () => {
            const task: TaskPayload = {
                title: 'Fondation du Nid',
                status: 'ACTIVE',
                dependencies: [{ id: 'dep-1', status: 1 }]
            };

            const result = TaskIrrigationOrchestrator.evaluateAndSanitize(task);

            expect(result.isIrrigated).toBe(1);
            expect(result.status).toBe('ACTIVE');
        });

        it('💀 doit bloquer le flux et corrompre la tâche (statut ROMPU) si une dépendance est défaillante (It = 0)', () => {
            const task: TaskPayload = {
                title: 'Brique Compromise',
                status: 'ACTIVE',
                dependencies: [{ id: 'dep-broken', status: 0 }]
            };

            const result = TaskIrrigationOrchestrator.evaluateAndSanitize(task);

            expect(result.isIrrigated).toBe(0);
            expect(result.status).toBe('ROMPU');
        });
    });

    describe('processTaskIrrigation', () => {
        const orchestrator = new TaskIrrigationOrchestrator();

        it('❌ doit lever une erreur 404 si l’atome/tâche est introuvable dans la Silice', async () => {
            (TaskModel.findOne as any).mockResolvedValueOnce(null);

            const signature = { actorUid: 'actor-1', capabilities: [] };

            await expect(
                orchestrator.processTaskIrrigation('ghost-task', signature)
            ).rejects.toThrow(IlotError);
        });

        it('💧 doit exécuter l’irrigation et propager les modifications dans MongoDB et Neo4j', async () => {
            const mockTask = {
                uid: 'task-uid-123',
                slug: 'task-slug',
                content: { title: 'Atome Central' },
                status: 'ACTIVE',
                dependencies: [{ id: 'dep-1', status: 1 }]
            };

            (TaskModel.findOne as any).mockResolvedValueOnce(mockTask);

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockMongoSession = {};
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({ records: [] })
                };

                (TaskModel.findOneAndUpdate as any).mockReturnValueOnce({
                    lean: vi.fn().mockResolvedValueOnce({
                    ...mockTask,
                    status: 'ACTIVE',
                    metrics: { isIrrigated: 1 }
    })
});

                return await callback(mockMongoSession, mockNeo4jTx);
            });

            const signature = { actorUid: 'actor-1', capabilities: [] };
            const result = await orchestrator.processTaskIrrigation('task-slug', signature);

            expect(result.success).toBe(true);
            expect(result.taskUid).toBe('task-uid-123');
            expect(result.isIrrigated).toBe(1);
            expect(TaskModel.findOneAndUpdate).toHaveBeenCalled();
            expect(TransactionManager.execute).toHaveBeenCalled();
        });
    });
});
// packages/shared-core/src/sync-engine/__tests__/task.resonance.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskResonanceOrchestrator } from '../task.resonance.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// Mocks des modèles Mongoose et du TransactionManager
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
    OiseauModel: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn()
    }
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
    TaskModel: {
        find: vi.fn()
    }
}));

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn()
    }
}));

describe('TaskResonanceOrchestrator - Résonance des Tâches Accomplies', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateTaskResonance', () => {
        it('🎶 doit calculer correctement la résonance (Rz) d’une tâche avec une efficacité normale', () => {
            const task = { estimatedTime: 4, realTime: 2, weight: 3 };
            // (4 / 2) * 3 = 6.00
            const rz = TaskResonanceOrchestrator.calculateTaskResonance(task);
            expect(rz).toBe(6.0);
        });

        it('🛡️ doit éviter la division par zéro si realTime est égal à 0 en forçant un minimum de 0.1', () => {
            const task = { estimatedTime: 5, realTime: 0, weight: 2 };
            // (5 / 0.1) * 2 = 100.00
            const rz = TaskResonanceOrchestrator.calculateTaskResonance(task);
            expect(rz).toBe(100.0);
        });
    });

    describe('calculateBatchResonance', () => {
        it('📈 doit sommer la résonance d’un lot de tâches de manière précise', () => {
            const tasks = [
                { estimatedTime: 4, realTime: 2, weight: 2 }, // (4/2)*2 = 4
                { estimatedTime: 3, realTime: 3, weight: 5 }  // (3/3)*5 = 5
            ];
            const batchRz = TaskResonanceOrchestrator.calculateBatchResonance(tasks);
            expect(batchRz).toBe(9.0);
        });

        it('🌱 doit retourner 0 si le lot de tâches est vide ou non défini', () => {
            expect(TaskResonanceOrchestrator.calculateBatchResonance([])).toBe(0);
            expect(TaskResonanceOrchestrator.calculateBatchResonance(null as any)).toBe(0);
        });
    });

    describe('processUserTaskResonance', () => {
        const orchestrator = new TaskResonanceOrchestrator();

        it('❌ doit lever une erreur 404 si l’oiseau est introuvable dans la Silice', async () => {
            (OiseauModel.findOne as any).mockResolvedValueOnce(null);

            const signature = { actorUid: 'actor-1', capabilities: [] };

            await expect(
                orchestrator.processUserTaskResonance('ghost-bird', signature)
            ).rejects.toThrow(IlotError);
        });

        it('🎶 doit calculer la résonance des tâches complétées et mettre à jour MongoDB et Neo4j', async () => {
            const mockUser = { uid: 'bird-uid-456', slug: 'bird-slug' };
            (OiseauModel.findOne as any).mockResolvedValueOnce(mockUser);

            const mockCompletedTasks = [
                {
                    pomodoros: { estimated: 2, completed: 1 },
                    metrics: { complexity: 3 }
                }
            ]; // Rz = (2 / 1) * 3 = 6
            (TaskModel.find as any).mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce(mockCompletedTasks)
            });

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockMongoSession = {};
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({ records: [] })
                };

                (OiseauModel.findOneAndUpdate as any).mockReturnValueOnce({
                  lean: vi.fn().mockResolvedValueOnce({
                  ...mockUser,
                  metrics: { totalResonance: 6 }
    })
});

                return await callback(mockMongoSession, mockNeo4jTx);
            });

            const signature = { actorUid: 'actor-1', capabilities: [] };
            const result = await orchestrator.processUserTaskResonance('bird-slug', signature);

            expect(result.success).toBe(true);
            expect(result.userUid).toBe('bird-uid-456');
            expect(result.completedTasksCount).toBe(1);
            expect(result.totalResonance).toBe(6.0);
            expect(OiseauModel.findOneAndUpdate).toHaveBeenCalled();
            expect(TransactionManager.execute).toHaveBeenCalled();
        });
    });
});
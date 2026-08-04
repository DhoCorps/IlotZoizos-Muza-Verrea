// packages/shared-core/src/sync-engine/__tests__/sovereign.purge.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SovereignPurgeOrchestrator, PurgeContext } from '../sovereign.purge.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TaskModel } from '../../../../infrastructure/src/database/models/nosql/task.model';
import { ProjectModel } from '../../../../infrastructure/src/database/models/nosql/project.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// Mocks des modèles Mongoose et du TransactionManager
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
    OiseauModel: { deleteOne: vi.fn() }
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/task.model', () => ({
    TaskModel: { deleteMany: vi.fn() }
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/project.model', () => ({
    ProjectModel: { deleteMany: vi.fn() }
}));

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn()
    }
}));

describe('SovereignPurgeOrchestrator - L’Évanescence & Le Terminus', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('⚖️ doit évaluer correctement la validité de la dissolution finale (D_infinit)', () => {
        const shouldPurge = SovereignPurgeOrchestrator.evaluateDissolution(-12, -5);
        expect(shouldPurge).toBe(true);

        const shouldNotPurge = SovereignPurgeOrchestrator.evaluateDissolution(2, -5);
        expect(shouldNotPurge).toBe(false);
    });

    it('📦 doit construire le payload de purge avec les bons métadonnées', () => {
        const context: PurgeContext = {
            entityId: 'bird-exile-42',
            reason: 'VOLUNTARY_EXILE'
        };

        const payload = SovereignPurgeOrchestrator.buildPurgePayload(context);

        expect(payload.targetUid).toBe('bird-exile-42');
        expect(payload.action).toBe('PURGE_COMPLETE');
        expect(payload.sanitizedCollections).toContain('users');
        expect(payload.graphNodePattern).toContain('bird-exile-42');
    });

    describe('executeSovereignPurge', () => {
        const orchestrator = new SovereignPurgeOrchestrator();

        it('❌ doit rejeter la purge si l’acteur n’est ni l’entité elle-même ni porteur des pleins pouvoirs (*)', async () => {
            const context: PurgeContext = { entityId: 'bird-target', reason: 'VOLUNTARY_EXILE' };
            const signature = { actorUid: 'other-bird', capabilities: ['READ'] };

            await expect(
                orchestrator.executeSovereignPurge(context, signature)
            ).rejects.toThrow(IlotError);
        });

        it('💨 doit exécuter la dissolution souveraine si l’acteur est l’entité concernée', async () => {
            const context: PurgeContext = { entityId: 'bird-self', reason: 'VOLUNTARY_EXILE' };
            const signature = { actorUid: 'bird-self', capabilities: [] };

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockMongoSession = {};
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({
                        records: [{ get: () => ({ toNumber: () => 1 }) }]
                    })
                };

                (OiseauModel.deleteOne as any).mockResolvedValueOnce({ deletedCount: 1 });
                (TaskModel.deleteMany as any).mockResolvedValueOnce({ deletedCount: 2 });
                (ProjectModel.deleteMany as any).mockResolvedValueOnce({ deletedCount: 1 });

                return await callback(mockMongoSession, mockNeo4jTx);
            });

            const result = await orchestrator.executeSovereignPurge(context, signature);

            expect(result.success).toBe(true);
            expect(result.payload.targetUid).toBe('bird-self');
            expect(result.neo4jDeletedCount).toBe(1);
            expect(TransactionManager.execute).toHaveBeenCalled();
        });

        it('💨 doit exécuter la dissolution souveraine si l’acteur possède les pleins pouvoirs (*)', async () => {
            const context: PurgeContext = { entityId: 'target-bird', reason: 'VITAL_COLLAPSE' };
            const signature = { actorUid: 'architect-uid', capabilities: ['*'] };

            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({
                        records: [{ get: () => ({ toNumber: () => 1 }) }]
                    })
                };
                return await callback({}, mockNeo4jTx);
            });

            const result = await orchestrator.executeSovereignPurge(context, signature);
            expect(result.success).toBe(true);
            expect(result.payload.targetUid).toBe('target-bird');
        });
    });
});
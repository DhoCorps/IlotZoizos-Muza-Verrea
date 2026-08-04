// packages/shared-core/src/sync-engine/__tests__/demopraxy.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DemopraxyOrchestrator, NuisanceMetrics } from '../demopraxy.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { CAPABILITIES } from '@ilot/types';

// Mock de Mongoose et du TransactionManager
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
    OiseauModel: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    }
}));

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn()
    }
}));

describe('DemopraxyOrchestrator - Régulation et Vortex Démopraxique', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🌱 doit calculer correctement le seuil d’exclusion symétrique (Ex)', () => {
        const metrics: NuisanceMetrics = {
            systemicHatredScore: 6,
            recurrenceCount: 3,
            recalibrationCapacity: 2,
            collectiveResonance: 4
        };

        // Ex = (6 * 3) / 2 = 9.0
        const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
        expect(score).toBe(9.0);
    });

    it('🛡️ doit empêcher la division par zéro en ajustant le recalibrage minimal à 0.1', () => {
        const metrics: NuisanceMetrics = {
            systemicHatredScore: 5,
            recurrenceCount: 2,
            recalibrationCapacity: 0,
            collectiveResonance: 0
        };

        // Ex = (5 * 2) / 0.1 = 100.0
        const score = DemopraxyOrchestrator.calculateExclusionThreshold(metrics);
        expect(score).toBe(100.0);
    });

    it('🌑 doit évaluer que le sanctuaire doit être exclu si Ex >= 15.0', () => {
        const metrics: NuisanceMetrics = {
            systemicHatredScore: 8,
            recurrenceCount: 3,
            recalibrationCapacity: 1.5,
            collectiveResonance: 0
        };

        // Ex = (8 * 3) / 1.5 = 16.0
        const safety = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
        expect(safety.isExcluded).toBe(true);
        expect(safety.exScore).toBe(16.0);
        expect(safety.actionMessage).toContain("Seuil d'exclusion atteint");
    });

    it('🌱 doit évaluer que le flux est sécurisé si Ex < 15.0', () => {
        const metrics: NuisanceMetrics = {
            systemicHatredScore: 2,
            recurrenceCount: 1,
            recalibrationCapacity: 5,
            collectiveResonance: 8
        };

        // Ex = (2 * 1) / 5 = 0.4
        const safety = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
        expect(safety.isExcluded).toBe(false);
        expect(safety.exScore).toBe(0.4);
        expect(safety.actionMessage).toContain("Flux sous le seuil critique");
    });

    describe('processDemopraxicEvaluation', () => {
        const orchestrator = new DemopraxyOrchestrator();

        it('❌ doit rejeter l’évaluation si l’acteur n’a pas les capacités requises', async () => {
            const signature = { actorUid: 'user-1', capabilities: ['READ'] };
            const metrics: NuisanceMetrics = { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 5 };

            await expect(
                orchestrator.processDemopraxicEvaluation('target-bird', metrics, signature)
            ).rejects.toThrow(IlotError);
        });

        it('❌ doit lever une erreur 404 si l’oiseau cible est introuvable', async () => {
            (OiseauModel.findOne as any).mockResolvedValueOnce(null);

            const signature = { actorUid: 'admin-uid', capabilities: ['*'] };
            const metrics: NuisanceMetrics = { systemicHatredScore: 5, recurrenceCount: 1, recalibrationCapacity: 5, collectiveResonance: 5 };

            await expect(
                orchestrator.processDemopraxicEvaluation('ghost-bird', metrics, signature)
            ).rejects.toThrow("Oiseau introuvable dans la Silice.");
        });

        it('🌀 doit exécuter la stase dans la transaction hybride si l’oiseau est trouvé et autorisé', async () => {
            const mockUser = { uid: 'bird-uid-123', slug: 'bird-slug' };
            (OiseauModel.findOne as any).mockResolvedValueOnce(mockUser);

            const mockTxResult = { success: true, targetUid: 'bird-uid-123', isExcluded: true };
            (TransactionManager.execute as any).mockImplementationOnce(async (name: string, callback: any) => {
                const mockMongoSession = {};
                const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
                
               (OiseauModel.findOneAndUpdate as any).mockReturnValueOnce({
                    lean: vi.fn().mockResolvedValueOnce({ uid: 'bird-uid-123', sanctuaireVerrouille: true })
                });
                return await callback(mockMongoSession, mockNeo4jTx);
            });

            const signature = { actorUid: 'admin-uid', capabilities: [CAPABILITIES.MEMBER.EXILE] };
            const metrics: NuisanceMetrics = { systemicHatredScore: 9, recurrenceCount: 2, recalibrationCapacity: 1, collectiveResonance: 0 };

            const result = await orchestrator.processDemopraxicEvaluation('bird-slug', metrics, signature);

            expect(result.success).toBe(true);
            expect(result.isExcluded).toBe(true);
            expect(result.targetUid).toBe('bird-uid-123');
            expect(TransactionManager.execute).toHaveBeenCalled();
        });
    });
});
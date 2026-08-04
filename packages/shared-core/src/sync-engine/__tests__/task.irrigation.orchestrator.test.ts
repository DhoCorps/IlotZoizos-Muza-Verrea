// packages/shared-core/src/sync-engine/__tests__/task.irrigation.orchestrator.test.ts
import { describe, it, expect } from 'vitest';
import { TaskIrrigationOrchestrator } from '../task.irrigation.orchestrator';

describe('TaskIrrigationOrchestrator - La Loi de l\'Irrigation', () => {
    it('🌱 doit laisser le flux actif si toutes les dépendances sont saines (1)', () => {
        const task = {
            title: 'Fondation du Nid',
            status: 'ACTIVE' as const,
            dependencies: [{ id: '1', status: 1 }, { id: '2', status: 1 }]
        };

        const result = TaskIrrigationOrchestrator.evaluateAndSanitize(task);
        expect(result.isIrrigated).toBe(1);
        expect(result.status).toBe('ACTIVE');
    });

    it('💀 doit bloquer le flux et corrompre/rompre la tâche si une seule dépendance est à 0', () => {
        const taintedTask = {
            title: 'Brique Compromise',
            status: 'ACTIVE' as const,
            dependencies: [{ id: '1', status: 1 }, { id: '2', status: 0 }]
        };

        const result = TaskIrrigationOrchestrator.evaluateAndSanitize(taintedTask);
        expect(result.isIrrigated).toBe(0);
        expect(result.status).toBe('ROMPU');
    });
});
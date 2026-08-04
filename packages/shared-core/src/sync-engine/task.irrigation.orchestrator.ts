// packages/shared-core/src/sync-engine/task.irrigation.orchestrator.ts
import { SeveEngine, Dependency } from '../utils/seve.engine';

export interface TaskPayload {
    title: string;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ROMPU';
    dependencies: Dependency[];
    isIrrigated?: number;
}

export class TaskIrrigationOrchestrator {
    /**
     * Applique la Loi de l'Irrigation (It) sur un flux de tâches.
     * Si l'irrigation chute à 0, le flux est coupé en cascade dans MongoDB.
     */
    public static evaluateAndSanitize(taskData: TaskPayload): TaskPayload {
        // Calcul via le SeveEngine (It = prod(sigma(di)))
        const irrigationFlow = SeveEngine.calculateIrrigation(taskData.dependencies);

        taskData.isIrrigated = irrigationFlow;

        // Si une seule racine est à 0, la sève s'arrête : la tâche est étouffée (ROMPU)
        if (irrigationFlow === 0) {
            taskData.status = 'ROMPU';
            console.warn(`💀 [Sève] Irrigation rompue pour la tâche "${taskData.title}". Flux stoppé dans MongoDB.`);
        } else {
            console.log(`🌱 [Sève] Irrigation active pour "${taskData.title}" (It = 1).`);
        }

        return taskData;
    }
}
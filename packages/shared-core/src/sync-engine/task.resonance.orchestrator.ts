// packages/shared-core/src/sync-engine/task.resonance.orchestrator.ts
import { TaskResonanceInput } from './../utils/seve.engine';


export class TaskResonanceOrchestrator {
    /**
     * Calcule la résonance (Rz) d'une tâche ou d'un ensemble de tâches accomplies.
     */
    public static calculateTaskResonance(task: TaskResonanceInput): number {
        const realTime = Math.max(0.1, task.realTime); // Évite la division par zéro
        const efficiency = task.estimatedTime / realTime;
        const resonance = efficiency * task.weight;
        
        return Number(resonance.toFixed(2));
    }

    /**
     * Calcule la résonance globale d'un lot de tâches terminées par un Oiseau
     */
    public static calculateBatchResonance(tasks: TaskResonanceInput[]): number {
        if (!tasks || tasks.length === 0) return 0;
        
        const totalResonance = tasks.reduce((sum, task) => {
            return sum + this.calculateTaskResonance(task);
        }, 0);

        return Number(totalResonance.toFixed(2));
    }
}
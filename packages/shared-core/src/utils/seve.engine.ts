// packages/shared-core/src/utils/seve.engine.ts

export interface Dependency {
    id: string;
    status: number; // 1 (intègre) ou 0 (trahi/rompu)
}

export interface TaskResonanceInput {
    estimatedTime: number;
    realTime: number;
    weight: number;
}

export interface ExchangeItem {
    type: 'GIFT' | 'TAKE';
    value: number;
}

export interface EcosystemPulseInput {
    totalResonance: number;
    activeStasisCount: number;
    totalBirds: number;
}

export class SeveEngine {
    /**
     * 1. La Loi de l'Irrigation (It)
     * Détermine si une tâche reçoit la vie (1 ou 0) en fonction de ses racines.
     * Une seule trahison (0) annule tout le flux par multiplication en cascade.
     */
    public static calculateIrrigation(dependencies: Dependency[]): number {
        if (!dependencies || dependencies.length === 0) return 1;
        return dependencies.reduce((acc, dep) => acc * (dep.status > 0 ? 1 : 0), 1);
    }

    /**
     * 2. L'Équation de la Résonance (Rz)
     * Calcule la vibration d'un oiseau selon son efficience (Temps estimé / Temps réel) 
     * pondérée par le poids du défi (Wj).
     */
    public static calculateResonance(tasks: TaskResonanceInput[]): number {
        if (!tasks || tasks.length === 0) return 0;
        return tasks.reduce((sum, task) => {
            if (task.realTime <= 0) return sum;
            const efficiency = task.estimatedTime / task.realTime;
            return sum + (efficiency * task.weight);
        }, 0);
    }

    /**
     * 3. La Balance Vitale / Seuil de Prédation (Lambda)
     * Identifie le point de rupture entre l'échange et le pillage (Somme des Dons - Somme des Prises).
     */
    public static calculateVitalBalance(exchanges: ExchangeItem[]): number {
        if (!exchanges || exchanges.length === 0) return 0;
        const gifts = exchanges.filter(e => e.type === 'GIFT').reduce((s, e) => s + e.value, 0);
        const takes = exchanges.filter(e => e.type === 'TAKE').reduce((s, e) => s + e.value, 0);
        return gifts - takes;
    }

    /**
     * 4. L'Équation du Temps de Stase (T_pause)
     * Calcule la durée de la mise en stase nécessaire pour digérer l'émotion brute
     * en fonction de l'intensité et de la capacité d'acceptation actuelle de l'Oiseau.
     */
    public static calculateStasisTime(emotionalIntensity: number, currentAcceptance: number): number {
        const acceptance = Math.max(1, currentAcceptance); // Évite la division par zéro
        const pauseMinutes = emotionalIntensity / acceptance;
        return Number(pauseMinutes.toFixed(1));
    }

    /**
     * 5. L'Équation de la Juste Prise (Jp)
     * Distingue le besoin biologique de la prédation perverse.
     * Jp = (Don / Besoin) * Facteur de création (Omega)
     */
    public static calculateJustTake(totalGifts: number, currentNeeds: number, creationFactor: number): number {
        const needs = Math.max(0.1, currentNeeds); // Évite la division par zéro
        const ratio = totalGifts / needs;
        const justTakeScore = ratio * creationFactor;
        return Number(justTakeScore.toFixed(2));
    }

    /**
     * 6. L'Indice de Pulsation Globale (Pg)
     * Calcule la tension ou l'harmonie de l'écosystème pour moduler l'uniformisation visuelle.
     */
    public static calculateGlobalPulsation(input: EcosystemPulseInput): number {
        const birds = Math.max(1, input.totalBirds);
        const basePulse = (input.totalResonance / birds) - (input.activeStasisCount * 2);
        // Normalisation entre 0 (urgence/rouge sombre) et 100 (harmonie/gris-bleuté)
        const normalizedPulse = Math.max(0, Math.min(100, basePulse * 10));
        return Number(normalizedPulse.toFixed(1));
    }
}
// packages/shared-core/src/utils/observatory.engine.ts
import { SeveEngine, Dependency, TaskResonanceInput, ExchangeItem } from './seve.engine';

export interface BirdActivityData {
    dependencies: Dependency[];
    tasks: TaskResonanceInput[];
    exchanges: ExchangeItem[];
    emotionalIntensity: number; // 0 à 100 (Surcharge émotionnelle)
    currentAcceptance: number;  // 1 à 10 (Capacité d'acceptation actuelle)
}

export interface VibratoryReport {
    frequencyHz: number;
    aura: string;
    vitalBalance: number;
    irrigationStatus: number;
    resonanceScore: number;
    staseTimeMinutes: number;
    isVolièreHealthy: boolean;
}

export class ObservatoryEngine {
    /**
     * 🔭 Génère le rapport vibratoire complet d'un Oiseau ou d'un espace de travail
     */
    public static generateReport(data: BirdActivityData): VibratoryReport {
        const irrigationStatus = SeveEngine.calculateIrrigation(data.dependencies);
        const resonanceScore = SeveEngine.calculateResonance(data.tasks);
        const vitalBalance = SeveEngine.calculateVitalBalance(data.exchanges);

        // Calcul du score global de santé (0 à 100)
        // Si l'irrigation est coupée (0), le score chute drastiquement
        let baseScore = Math.min(100, Math.max(0, (resonanceScore * 10) + (vitalBalance / 2)));
        if (irrigationStatus === 0) baseScore = baseScore * 0.2;

        // Fréquence vibratoire simulée de 10Hz (Ombre) à 963Hz (Harmonie pure)
        const frequencyHz = Math.round(10 + (baseScore / 100) * 953);

        // Détermination de l'Aura
        let aura = "Harmonie Céleste";
        if (frequencyHz < 200) aura = "Brume de Discorde (Ombre)";
        else if (frequencyHz < 500) aura = "Résonance Instable";
        else if (frequencyHz < 800) aura = "Souveraineté Sereine";

        // Temps de stase (Temps de pause nécessaire en minutes)
        // P_pause = Intensité de l'émotion / Capacité d'acceptation actuelle
        const acceptance = Math.max(1, data.currentAcceptance);
        const staseTimeMinutes = Math.round(data.emotionalIntensity / acceptance);

        const isVolièreHealthy = irrigationStatus === 1 && vitalBalance >= 0 && frequencyHz >= 400;

        return {
            frequencyHz,
            aura,
            vitalBalance,
            irrigationStatus,
            resonanceScore: Number(resonanceScore.toFixed(2)),
            staseTimeMinutes,
            isVolièreHealthy
        };
    }
}
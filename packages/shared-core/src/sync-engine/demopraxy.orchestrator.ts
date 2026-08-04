// packages/shared-core/src/sync-engine/demopraxy.orchestrator.ts

export interface NuisanceMetrics {
    systemicHatredScore: number; // Indice de toxicité textuelle ou comportementale (0 à 10)
    recurrenceCount: number;    // Nombre de récidives documentées dans le graphe
    recalibrationCapacity: number; // Capacité de l'oiseau à évoluer (1 à 10)
    collectiveResonance: number;  // Vibration positive apportée à la volière
}

export class DemopraxyOrchestrator {
    /**
     * Calcule le Seuil d'Exclusion Symétrique (Ex)
     * Ex = (Haine Systémique * Récurrence) / Capacité de Recalibrage
     */
    public static calculateExclusionThreshold(metrics: NuisanceMetrics): number {
        const recalibration = Math.max(0.1, metrics.recalibrationCapacity); // Évite la division par zéro
        const exScore = (metrics.systemicHatredScore * metrics.recurrenceCount) / recalibration;
        return Number(exScore.toFixed(2));
    }

    /**
     * Détermine si un profil ou un contenu doit être mis en stase d'exclusion (banni par le vortex)
     */
    public static evaluateSanctuarySafety(metrics: NuisanceMetrics): { isExcluded: boolean; actionMessage: string } {
        const exThreshold = this.calculateExclusionThreshold(metrics);

        // Seuil critique d'exclusion symétrique fixé à 15.0
        if (exThreshold >= 15.0) {
            return {
                isExcluded: true,
                actionMessage: `🌑 [Démopraxie] Seuil d'exclusion atteint (Ex = ${exThreshold}). Le vortex isole le profil pour préserver la quiétude du nid.`
            };
        }

        return {
            isExcluded: false,
            actionMessage: `🌱 [Démopraxie] Flux sous le seuil critique (Ex = ${exThreshold}). La volière absorbe et transforme le bruit.`
        };
    }
}
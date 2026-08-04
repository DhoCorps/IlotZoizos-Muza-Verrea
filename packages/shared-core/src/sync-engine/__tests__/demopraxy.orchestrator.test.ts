// packages/shared-core/src/sync-engine/__tests__/demopraxy.orchestrator.test.ts
import { describe, it, expect } from 'vitest';
import { DemopraxyOrchestrator } from '../demopraxy.orchestrator';

describe('DemopraxyOrchestrator - Le Bouclier de la Volière', () => {
    it('🛡️ doit maintenir un profil sain dans la volière si son taux de haine est faible ou son recalibrage élevé', () => {
        const healthyProfile = {
            systemicHatredScore: 2,
            recurrenceCount: 1,
            recalibrationCapacity: 8,
            collectiveResonance: 12
        };

        const result = DemopraxyOrchestrator.evaluateSanctuarySafety(healthyProfile);
        expect(result.isExcluded).toBe(false);
    });

    it('🌑 doit déclencher l\'exclusion symétrique (Ex >= 15) en cas de nuisance répétée sans recalibrage', () => {
        const toxicProfile = {
            systemicHatredScore: 8,
            recurrenceCount: 4, // Récidive lourde
            recalibrationCapacity: 1, // Refus total de se remettre en question
            collectiveResonance: 0
        };

        const threshold = DemopraxyOrchestrator.calculateExclusionThreshold(toxicProfile);
        // (8 * 4) / 1 = 32.0 (largement au-dessus de 15)
        expect(threshold).toBe(32.0);

        const result = DemopraxyOrchestrator.evaluateSanctuarySafety(toxicProfile);
        expect(result.isExcluded).toBe(true);
    });
});
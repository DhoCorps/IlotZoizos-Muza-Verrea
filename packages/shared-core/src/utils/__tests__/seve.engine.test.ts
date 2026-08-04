// packages/shared-core/src/utils/__tests__/seve.engine.test.ts
import { describe, it, expect } from 'vitest';
import { SeveEngine } from '../seve.engine';

describe('SeveEngine - La Physique de l\'Îlot', () => {
    it('🌱 [Irrigation] doit valider le flux si toutes les racines sont intègres (1)', () => {
        const healthyDeps = [{ id: '1', status: 1 }, { id: '2', status: 1 }];
        expect(SeveEngine.calculateIrrigation(healthyDeps)).toBe(1);
    });

    it('💀 [Irrigation] doit couper instantanément la sève si une seule racine défaille (0)', () => {
        const taintedDeps = [{ id: '1', status: 1 }, { id: '2', status: 0 }];
        expect(SeveEngine.calculateIrrigation(taintedDeps)).toBe(0);
    });

    it('✨ [Résonance] doit calculer précisément la vibration selon l\'efficience et le poids', () => {
        const tasks = [
            { estimatedTime: 10, realTime: 10, weight: 2 }, // Efficience 1.0 * Poids 2 = 2
            { estimatedTime: 5, realTime: 10, weight: 4 }    // Efficience 0.5 * Poids 4 = 2
        ];
        expect(SeveEngine.calculateResonance(tasks)).toBe(4);
    });

    it('⚖️ [Balance Vitale] doit soustraire les Prises des Dons pour révéler la justice de l\'échange', () => {
        const exchanges = [
            { type: 'GIFT' as const, value: 50 },
            { type: 'GIFT' as const, value: 30 },
            { type: 'TAKE' as const, value: 20 }
        ];
        // 80 (Dons) - 20 (Prises) = 60
        expect(SeveEngine.calculateVitalBalance(exchanges)).toBe(60);
    });

    it('🌙 [Temps de Stase] doit calculer la durée de pause nécessaire face à l\'intensité émotionnelle', () => {
        const emotionalIntensity = 45;
        const currentAcceptance = 3;
        // 45 / 3 = 15 minutes de stase
        expect(SeveEngine.calculateStasisTime(emotionalIntensity, currentAcceptance)).toBe(15);
    });

    it('🕊️ [Juste Prise] doit évaluer si le prélèvement est légitime selon le don, le besoin et le facteur de création', () => {
        const totalGifts = 20;
        const currentNeeds = 5;
        const creationFactor = 1.2; // Omega
        // (20 / 5) * 1.2 = 4 * 1.2 = 4.8
        expect(SeveEngine.calculateJustTake(totalGifts, currentNeeds, creationFactor)).toBe(4.8);
    });

    it('🌐 [Indice de Pulsation Globale] doit calculer la pulsation de l\'écosystème en tenant compte de la résonance et de la stase', () => {
        const input = {
            totalResonance: 50,
            activeStasisCount: 2,
            totalBirds: 5
        };
        // (50 / 5) - (2 * 2) = 10 - 4 = 6. 6 * 10 = 60.0
        expect(SeveEngine.calculateGlobalPulsation(input)).toBe(60.0);
    });
});
// packages/shared-core/src/sync-engine/__tests__/market.regulation.orchestrator.test.ts
import { describe, it, expect } from 'vitest';
import { MarketRegulationOrchestrator } from '../market.regulation.orchestrator';

describe('MarketRegulationOrchestrator - La Régulation du Troc et de la Marketplace', () => {
    it('⚖️ doit imposer une latence si l\'Oiseau bascule en déficit énergétique (Lambda < 0)', () => {
        const context = {
            uid: 'bird-taker-01',
            exchanges: [
                { type: 'GIFT' as const, value: 10 },
                { type: 'TAKE' as const, value: 40 } // Lambda = -30
            ],
            currentNeeds: 5,
            creationFactor: 1.5
        };

        const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 15);
        
        expect(result.vitalBalance).toBe(-30);
        expect(result.isAuthorized).toBe(true);
        expect(result.latencyMs).toBeGreaterThan(0); // Ralentissement de l'achat
    });

    it('🛑 doit rejeter une prise si le coefficient de création (Jp) est inférieur au seuil', () => {
        const context = {
            uid: 'bird-predator-02',
            exchanges: [
                { type: 'GIFT' as const, value: 2 },
                { type: 'TAKE' as const, value: 1 } // Lambda = +1 mais faible don
            ],
            currentNeeds: 10,
            creationFactor: 0.2 // Très faible capacité à générer de la vie
        };

        const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 20);
        
        expect(result.isAuthorized).toBe(false);
    });
});
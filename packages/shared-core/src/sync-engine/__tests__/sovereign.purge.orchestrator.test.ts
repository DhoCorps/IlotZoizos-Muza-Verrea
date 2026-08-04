// packages/shared-core/src/sync-engine/__tests__/sovereign.purge.orchestrator.test.ts
import { describe, it, expect } from 'vitest';
import { SovereignPurgeOrchestrator } from '../sovereign.purge.orchestrator';

describe('SovereignPurgeOrchestrator - L\'Évanescence & Le Terminus', () => {
    it('🌑 doit valider la dissolution si la balance vitale tombe sous le seuil critique', () => {
        const vitalBalance = -12;
        const threshold = 0;
        const shouldDissolve = SovereignPurgeOrchestrator.evaluateDissolution(vitalBalance, threshold);
        
        expect(shouldDissolve).toBe(true);
    });

    it('💨 doit générer un payload de purge propre sans laisser de traces pour les prédateurs', () => {
        const payload = SovereignPurgeOrchestrator.buildPurgePayload({
            entityId: 'bird-exile-42',
            reason: 'VOLUNTARY_EXILE'
        });

        expect(payload.targetUid).toBe('bird-exile-42');
        expect(payload.action).toBe('PURGE_COMPLETE');
        expect(payload.sanitizedCollections).toContain('users');
    });
});
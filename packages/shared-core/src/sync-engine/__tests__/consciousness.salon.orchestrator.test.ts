// packages/shared-core/src/sync-engine/__tests__/consciousnouss.salon.orchestrator.test.ts
import { describe, it, expect } from 'vitest';
import { ConsciousnessSalonOrchestrator } from '../consciousness.salon.orchestrator';
import { IlotError } from '../../errors/ilot.errors';

describe('ConsciousnessSalonOrchestrator - Le Salon de la Conscience Partagée', () => {
    
    it('✅ doit calculer correctement le niveau d intrication quantique (C = S ⊗ B)', () => {
        const entanglement = ConsciousnessSalonOrchestrator.calculateEntanglementLevel(0.85, 0.90);
        // 0.85 * 0.90 = 0.765
        expect(entanglement).toBe(0.765);
    });

    it('✅ doit sceller (chiffrer E2EE) et dés-enchâsser (déchiffrer) une pensée avec succès', () => {
        const secretKey = 'cle-secrete-du-salon-prive';
        const plainThought = 'L oiseau contemple la canopée silencieuse.';

        // 1. Scellement de la pensée
        const sealed = ConsciousnessSalonOrchestrator.sealThought(plainThought, secretKey);
        
        expect(sealed).toBeDefined();
        expect(sealed.ciphertext).not.toBe(plainThought);
        expect(sealed.iv).toBeDefined();
        expect(sealed.tag).toBeDefined();
        expect(sealed.timestamp).toBeTypeOf('number');

        // 2. Dés-enchâssement de la pensée
        const unsealed = ConsciousnessSalonOrchestrator.unsealThought(sealed, secretKey);
        expect(unsealed).toBe(plainThought);
    });

    it('❌ doit échouer avec une IlotError 403 si la clé secrète est erronée ou la donnée corrompue', () => {
        const secretKey = 'vraie-cle';
        const wrongKey = 'fausse-cle';
        const plainThought = 'Pensée ultra-secrète.';

        const sealed = ConsciousnessSalonOrchestrator.sealThought(plainThought, secretKey);

        // On vérifie que la tentative de déchiffrement avec une mauvaise clé renvoie bien notre erreur métier
        expect(() => {
            ConsciousnessSalonOrchestrator.unsealThought(sealed, wrongKey);
        }).toThrow(IlotError);
        
        expect(() => {
            ConsciousnessSalonOrchestrator.unsealThought(sealed, wrongKey);
        }).toThrow(/Clé invalide ou pensée altérée/);
    });
});
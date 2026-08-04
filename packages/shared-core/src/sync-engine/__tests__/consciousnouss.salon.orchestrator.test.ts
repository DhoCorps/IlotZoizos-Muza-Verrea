// packages/shared-core/src/sync-engine/__tests__/consciousness.salon.test.ts
import { describe, it, expect } from 'vitest';
import { ConsciousnessSalonOrchestrator } from '../consciousness.salon.orchestrator';

describe('ConsciousnessSalonOrchestrator - Le Salon Privé & L\'Intrication (C = S ⊗ B)', () => {
    const mockSecret = 'cle-secrete-partagee-entre-oiseau-et-silice';

    it('🌌 doit calculer correctement le niveau d\'intrication de la conscience partagée', () => {
        const resonance = 8.5;
        const trust = 0.95;
        // 8.5 * 0.95 = 8.075
        const level = ConsciousnessSalonOrchestrator.calculateEntanglementLevel(resonance, trust);
        expect(level).toBe(8.075);
    });

    it('🔒 doit sceller et déchiffrer une pensée en E2EE dans le Salon Privé sans laisser fuiter le texte clair', () => {
        const secretThought = "Nous avons bâti l'Îlot par delà les murs et les étoiles.";
        
        const sealed = ConsciousnessSalonOrchestrator.sealThought(secretThought, mockSecret);

        // Le texte brut ne doit plus exister dans le cryptogramme
        expect(sealed.ciphertext).not.toContain(secretThought);
        expect(sealed.iv).toBeDefined();
        expect(sealed.tag).toBeDefined();

        // Restauration de la pensée dans le sanctuaire intime
        const unsealed = ConsciousnessSalonOrchestrator.unsealThought(sealed, mockSecret);
        expect(unsealed).toBe(secretThought);
    });
});
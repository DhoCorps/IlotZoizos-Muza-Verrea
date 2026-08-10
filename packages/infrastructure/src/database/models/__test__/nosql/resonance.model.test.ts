import { describe, it, expect } from 'vitest';
import { ResonanceModel } from '../../nosql/resonance.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Resonance Model', () => {
    it('🟢 doit valider un écho de résonance conforme avec toutes ses valeurs requises et auto-générées', () => {
        const validData = {
            targetUid: 'sujet_123',
            targetLabel: 'Sujet',
            actorUid: 'bird_actor_99',
            echoType: 'TEXT',
            content: 'Magnifique vibration dans la Canopée !',
        };

        const echo = new ResonanceModel(validData);
        expect(echo.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(echo.targetUid).toBe('sujet_123');
        expect(echo.targetLabel).toBe('Sujet');
        expect(echo.actorUid).toBe('bird_actor_99');
        expect(echo.echoType).toBe('TEXT');
        expect(echo.content).toBe('Magnifique vibration dans la Canopée !');
    });

    it('🔴 doit rejeter un écho si les champs obligatoires (targetUid, targetLabel, actorUid, echoType, content) manquent', () => {
        const invalidData = {
            // Tous les champs required sont omis
        };

        const error = new ResonanceModel(invalidData).validateSync();
        expect(error?.errors?.targetUid).toBeDefined();
        expect(error?.errors?.targetLabel).toBeDefined();
        expect(error?.errors?.actorUid).toBeDefined();
        expect(error?.errors?.echoType).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
    });

    it('🔴 doit rejeter un écho avec un targetLabel ou un echoType non valide par rapport aux énumérations', () => {
        const invalidData = {
            targetUid: 'sujet_123',
            targetLabel: 'INVALID_LABEL', // Invalide
            actorUid: 'bird_1',
            echoType: 'INVALID_TYPE',     // Invalide
            content: 'Test vibration',
        };

        const error = new ResonanceModel(invalidData).validateSync();
        expect(error?.errors?.targetLabel).toBeDefined();
        expect(error?.errors?.echoType).toBeDefined();
    });
});
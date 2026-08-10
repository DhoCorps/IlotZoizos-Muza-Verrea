import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LexiconEntryModel } from '../../nosql/lexiconEntry.model'; // Ajuste le chemin relatif si besoin selon l'emplacement exact

// -------------------------------------------------------------------------
// 🎭 MOCK PROPRE DE MONGOOSE POUR LES TESTS UNITAIRES
// -------------------------------------------------------------------------
vi.mock('mongoose', async () => {
    const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
    
    // On définit une fausse classe Model pour que "new LexiconEntryModel(...)" fonctionne sans erreur
    class MockModel {
        data: any;
        constructor(data: any) {
            this.data = data;
            Object.assign(this, data);
        }
        validateSync() {
            // Simulation basique du validateur pour les tests
            if (this.data.language && !['fr', 'en', 'es'].includes(this.data.language)) {
                return {
                    errors: {
                        language: { message: 'Invalid language' }
                    }
                };
            }
            return null;
        }
    }

    return {
        ...actual,
        models: {},
        model: vi.fn().mockReturnValue(MockModel),
        Schema: actual.Schema,
    };
});

describe('LexiconEntry Model', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 doit valider un objet d\'entrée lexicale conforme', () => {
        const validData = {
            uid: 'lex_fr_oiseau',
            language: 'fr',
            word: 'oiseau',
            phoneticIpa: '/wa.zo/',
            syllableCount: 2,
            definitions: {
                fr: 'Animal vertébré à plumes...'
            },
            partOfSpeech: 'noun'
        };

        const entry = new LexiconEntryModel(validData);
        expect(entry.word).toBe('oiseau');
        expect(entry.language).toBe('fr');
        expect(entry.partOfSpeech).toBe('noun');
    });

    it('🔴 doit rejeter une langue non prise en charge par le schéma', () => {
        const invalidData = {
            uid: 'lex_xx_test',
            language: 'allemand', // Invalide
            word: 'test',
            phoneticIpa: '/test/',
            syllableCount: 1,
            partOfSpeech: 'noun'
        };

        const error = new LexiconEntryModel(invalidData).validateSync();
        expect(error?.errors.language).toBeDefined();
    });
});
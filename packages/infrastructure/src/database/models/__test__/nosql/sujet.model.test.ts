import { describe, it, expect } from 'vitest';
import { SujetModel } from '../../nosql/sujet.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Sujet Model', () => {
    it('🟢 doit valider un sujet conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            title: 'Le Chant des Sélénites',
            slug: 'le-chant-des-selenites',
            content: 'Réflexion profonde sur la nature de la Silice et de la Canopée.',
            authorUid: 'bird_writer_77',
        };

        const sujet = new SujetModel(validData);
        expect(sujet.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(sujet.title).toBe('Le Chant des Sélénites');
        expect(sujet.slug).toBe('le-chant-des-selenites');
        expect(sujet.content).toBe('Réflexion profonde sur la nature de la Silice et de la Canopée.');
        expect(sujet.authorUid).toBe('bird_writer_77');
        expect(sujet.category).toBe('MONOLOGUE'); // Valeur par défaut
        expect(sujet.status).toBe('DRAFT');       // Valeur par défaut
        expect(sujet.settings.allowComments).toBe(true); // Valeur par défaut du sous-objet
    });

    it('🔴 doit rejeter un sujet si les champs obligatoires (title, slug, content, authorUid) manquent', () => {
        const invalidData = {
            lyrics: 'Paroles isolées sans en-tête',
            // Tous les champs required sont omis
        };

        const error = new SujetModel(invalidData).validateSync();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter un sujet avec un status ou une catégorie non valide par rapport aux énumérations', () => {
        const invalidData = {
            title: 'Test',
            slug: 'test',
            content: 'Contenu',
            authorUid: 'bird_1',
            status: 'UNKNOWN_STATUS',     // Invalide
            category: 'UNKNOWN_CATEGORY', // Invalide
        };

        const error = new SujetModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.category).toBeDefined();
    });
});
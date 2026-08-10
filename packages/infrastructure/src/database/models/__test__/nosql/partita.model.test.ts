import { describe, it, expect } from 'vitest';
import { PartitaModel } from '../../nosql/partita.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Partita Model', () => {
    it('🟢 doit valider une partita conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            title: 'Symphonie de la Canopée',
            slug: 'symphonie-de-la-canopee',
            content: 'X:1\nT:Symphonie\nK:C',
            authorUid: 'bird_composer_77',
        };

        const partita = new PartitaModel(validData);
        expect(partita.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(partita.title).toBe('Symphonie de la Canopée');
        expect(partita.slug).toBe('symphonie-de-la-canopee');
        expect(partita.content).toBe('X:1\nT:Symphonie\nK:C');
        expect(partita.authorUid).toBe('bird_composer_77');
        expect(partita.instrument).toBe('BASS'); // Valeur par défaut
        expect(partita.format).toBe('ABC');     // Valeur par défaut
        expect(partita.status).toBe('DRAFT');    // Valeur par défaut
        expect(partita.tuning).toBe('E1-A1-D2-G2');
    });

    it('🔴 doit rejeter une partita si les champs obligatoires racine (title, slug, content, authorUid) manquent', () => {
        const invalidData = {
            tuning: 'DROP-D',
            // Tous les champs required sont omis
        };

        const error = new PartitaModel(invalidData).validateSync();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter une partita avec un status ou un format non valide par rapport aux énumérations', () => {
        const invalidData = {
            title: 'Test',
            slug: 'test',
            content: 'ABC',
            authorUid: 'bird_1',
            status: 'UNKNOWN_STATUS', // Invalide
            format: 'UNKNOWN_FORMAT', // Invalide
        };

        const error = new PartitaModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.format).toBeDefined();
    });
});
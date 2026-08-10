import { describe, it, expect } from 'vitest';
import { FontProject } from '../../nosql/fontProject.model'; // Ajuste le chemin relatif selon ton arborescence

describe('FontProject Model', () => {
    it('🟢 doit valider un projet de police conforme avec ses valeurs par défaut', () => {
        const validData = {
            title: 'Mon Alphabet Sélénite',
            userId: 'bird_user_777',
        };

        const project = new FontProject(validData);
        expect(project.title).toBe('Mon Alphabet Sélénite');
        expect(project.resolution).toBe(16); // Valeur par défaut
        expect(project.license).toBe('free');   // Valeur par défaut
        expect(project.userId).toBe('bird_user_777');
    });

    it('🔴 doit rejeter un projet de police si le champ réellement requis (title) manque', () => {
        const invalidData = {
            resolution: 32,
            license: 'private',
            // title est omis
        };

        const error = new FontProject(invalidData).validateSync();
        expect(error?.errors?.title).toBeDefined();
    });

    it('🔴 doit rejeter un projet de police avec une licence non valide par rapport à l\'énumération', () => {
        const invalidData = {
            title: 'Alphabet Interdit',
            license: 'licence_inconnue', // Invalide
        };

        const error = new FontProject(invalidData).validateSync();
        expect(error?.errors?.license).toBeDefined();
    });
});
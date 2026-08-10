import { describe, it, expect } from 'vitest';
import { ProjectModel } from '../../nosql/project.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Project Model', () => {
    it('🟢 doit valider un projet conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            name: 'Îlot Zoizos Reboot',
            slug: 'ilot-zoizos-reboot',
            ownerUid: 'bird_owner_1',
            creatorUid: 'bird_creator_1',
        };

        const project = new ProjectModel(validData);
        expect(project.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(project.name).toBe('Îlot Zoizos Reboot');
        expect(project.slug).toBe('ilot-zoizos-reboot');
        expect(project.ownerUid).toBe('bird_owner_1');
        expect(project.creatorUid).toBe('bird_creator_1');
        expect(project.status).toBe('CONCEPT');     // Valeur par défaut
        expect(project.priority).toBe('MEDIUM');   // Valeur par défaut
        expect(project.category).toBe('TECHNICAL');// Valeur par défaut
        expect(project.visibility).toBe('PRIVATE');// Valeur par défaut
        expect(project.appearance.color).toBe('#8b9dc3'); // Couleur par défaut (Gris Bleuté)
    });

    it('🔴 doit rejeter un projet si les champs obligatoires (name, slug, ownerUid, creatorUid) manquent', () => {
        const invalidData = {
            description: 'Projet orphelin sans identifiants',
            // Tous les champs required sont omis
        };

        const error = new ProjectModel(invalidData).validateSync();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.ownerUid).toBeDefined();
        expect(error?.errors?.creatorUid).toBeDefined();
    });

    it('🔴 doit rejeter un projet avec un status ou une priorité non valide par rapport aux énumérations', () => {
        const invalidData = {
            name: 'Test',
            slug: 'test',
            ownerUid: 'bird_1',
            creatorUid: 'bird_1',
            status: 'UNKNOWN_STATUS',     // Invalide
            priority: 'UNKNOWN_PRIORITY', // Invalide
        };

        const error = new ProjectModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.priority).toBeDefined();
    });
});
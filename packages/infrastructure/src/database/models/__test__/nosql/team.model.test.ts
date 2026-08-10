import { describe, it, expect } from 'vitest';
import { TeamModel } from '../../nosql/team.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Team Model', () => {
    it('🟢 doit valider une équipe conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            name: 'Cercle des Sélénites',
            ownerUid: 'bird_owner_1',
        };

        const team = new TeamModel(validData);
        expect(team.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(team.name).toBe('Cercle des Sélénites');
        expect(team.ownerUid).toBe('bird_owner_1');
        expect(team.category).toBe('SOCIAL');     // Valeur par défaut
        expect(team.frequency).toBe('#2A3B4C');   // Valeur par défaut (Gris Bleuté)
        expect(team.isPrivate).toBe(true);        // Valeur par défaut
        expect(team.governance.votingSystem).toBe('DEMOCRATIC'); // Valeur par défaut
    });

    it('🔴 doit rejeter une équipe si les champs obligatoires (name, ownerUid) manquent', () => {
        const invalidData = {
            description: 'Équipe orpheline sans identifiants',
            // name et ownerUid sont omis
        };

        const error = new TeamModel(invalidData).validateSync();
        expect(error?.errors?.name).toBeDefined();
        expect(error?.errors?.ownerUid).toBeDefined();
    });

    it('🔴 doit rejeter une équipe avec un format de frequency (HEX) non valide ou une category non valide', () => {
        const invalidData = {
            name: 'Équipe Test',
            ownerUid: 'bird_owner_1',
            category: 'INVALID_CATEGORY', // Invalide
            frequency: 'INVALID_HEX',       // Invalide par rapport au validateur regex
        };

        const error = new TeamModel(invalidData).validateSync();
        expect(error?.errors?.category).toBeDefined();
        expect(error?.errors?.frequency).toBeDefined();
    });
});
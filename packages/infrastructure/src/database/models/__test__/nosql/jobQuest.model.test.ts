import { describe, it, expect } from 'vitest';
import { JobQuestModel } from '../../nosql/jobQuest.model'; // Ajuste le chemin relatif selon ton arborescence

describe('JobQuest Model', () => {
    it('🟢 doit valider une quête de poste conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'quest_123',
            projectUid: 'proj_456',
            title: 'Architecte de la Canopée',
            slug: 'architecte-de-la-canopee',
            description: 'Recherche un oiseau capable de structurer les flux Silice.',
            requiredSkills: ['TypeScript', 'Next.js'],
            rewardLore: 'Un fragment d\'étoile éternel',
        };

        const quest = new JobQuestModel(validData);
        expect(quest.uid).toBe('quest_123');
        expect(quest.projectUid).toBe('proj_456');
        expect(quest.title).toBe('Architecte de la Canopée');
        expect(quest.slug).toBe('architecte-de-la-canopee');
        expect(quest.description).toBe('Recherche un oiseau capable de structurer les flux Silice.');
        expect(quest.requiredSkills).toEqual(['TypeScript', 'Next.js']);
        expect(quest.rewardLore).toBe('Un fragment d\'étoile éternel');
        expect(quest.status).toBe('ACTIVE'); // Vérifie la valeur par défaut
    });

    it('🔴 doit rejeter une quête si les champs obligatoires (uid, projectUid, title, slug, description) manquent', () => {
        const invalidData = {
            rewardLore: 'Seule la récompense est présente',
        };

        const error = new JobQuestModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.projectUid).toBeDefined();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.description).toBeDefined();
    });

    it('🔴 doit rejeter une quête avec un status non valide par rapport à l\'énumération', () => {
        const invalidData = {
            uid: 'quest_789',
            projectUid: 'proj_456',
            title: 'Test Quête',
            slug: 'test-quete',
            description: 'Description de test',
            status: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new JobQuestModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });
});
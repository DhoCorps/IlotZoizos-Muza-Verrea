import { describe, it, expect } from 'vitest';
import { JobQuestModel } from '../../nosql/jobQuest.model'; 

describe('JobQuest Model (Recrutement & Quêtes)', () => {
    it('🟢 doit valider une quête conforme avec ses valeurs requises, logistiques, entreprise et RPG par défaut', () => {
        const validData = {
            uid: 'quest_123',
            projectUid: 'proj_456',
            title: 'Architecte de la Canopée',
            slug: 'architecte-de-la-canopee',
            description: 'Recherche un oiseau capable de structurer les flux Silice.',
            company: {
                name: 'Guilde des Zoizos',
                description: 'Forgerons du code MERN',
            },
            requiredSkills: ['TypeScript', 'Next.js'],
            bonusSkills: ['Zod', 'Mongoose'],
            rewardLore: 'Un fragment d\'étoile éternel',
            minBudgetCents: 45000,
            maxBudgetCents: 50000,
            perks: ['Setup triple écran', 'Café infusé à froid']
        };

        const quest = new JobQuestModel(validData);
        expect(quest.uid).toBe('quest_123');
        expect(quest.projectUid).toBe('proj_456');
        expect(quest.title).toBe('Architecte de la Canopée');
        expect(quest.slug).toBe('architecte-de-la-canopee');
        expect(quest.description).toBe('Recherche un oiseau capable de structurer les flux Silice.');
        expect(quest.company?.name).toBe('Guilde des Zoizos');
        expect(quest.requiredSkills).toEqual(['TypeScript', 'Next.js']);
        expect(quest.bonusSkills).toEqual(['Zod', 'Mongoose']);
        expect(quest.rewardLore).toBe('Un fragment d\'étoile éternel');
        expect(quest.minBudgetCents).toBe(45000);
        expect(quest.maxBudgetCents).toBe(50000);
        expect(quest.perks).toEqual(['Setup triple écran', 'Café infusé à froid']);
        
        // Vérification des valeurs injectées par défaut (Mongoose)
        expect(quest.status).toBe('ACTIVE'); 
        expect(quest.workArrangement).toBe('FULL_REMOTE');
        expect(quest.contractType).toBe('FREELANCE');
        expect(quest.employmentType).toBe('FULL_TIME');
        expect(quest.experienceLevel).toBe('CONFIRMED');
        expect(quest.location).toBe('Remote');
        expect(quest.budgetType).toBe('DAILY_RATE');
        expect(quest.currency).toBe('EUR');
        expect(quest.questDifficulty).toBe('NORMAL');
        expect(quest.dangerLevel).toBe(10);
        expect(quest.settings?.allowApplications).toBe(true);
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

    it('🔴 doit rejeter une quête avec un status, un mode de travail ou un type d\'emploi non valide', () => {
        const invalidData = {
            uid: 'quest_789',
            projectUid: 'proj_456',
            title: 'Test Quête',
            slug: 'test-quete',
            description: 'Description de test',
            status: 'UNKNOWN_STATUS', // Invalide
            workArrangement: 'TELEPORTATION', // Invalide
            employmentType: 'MAGIC_CONTRACT' // Invalide
        };

        const error = new JobQuestModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.workArrangement).toBeDefined();
        expect(error?.errors?.employmentType).toBeDefined();
    });

    it('🔴 doit rejeter une quête avec une hérésie mathématique (minBudget > maxBudget)', () => {
        const illogicalBudgetQuest = {
            uid: 'quest_math_error',
            projectUid: 'proj_456',
            title: 'Test Quête Budget',
            slug: 'test-quete-budget',
            description: 'Mission impossible',
            minBudgetCents: 80000, 
            maxBudgetCents: 65000 // min est supérieur au max
        };

        const error = new JobQuestModel(illogicalBudgetQuest).validateSync();
        expect(error?.errors?.minBudgetCents).toBeDefined();
        expect(error?.errors?.minBudgetCents.message).toContain('Hérésie mathématique');
    });

    it('🔴 doit rejeter une quête avec un budget de matchmaking négatif ou une jauge de danger hors limite', () => {
        const invalidNumericData = {
            uid: 'quest_999',
            projectUid: 'proj_456',
            title: 'Test Quête Extrême',
            slug: 'test-quete-extreme',
            description: 'Mission impossible',
            maxBudgetCents: -5000, // Invalide (min: 0)
            dangerLevel: 150 // Invalide (max: 100)
        };

        const error = new JobQuestModel(invalidNumericData).validateSync();
        expect(error?.errors?.maxBudgetCents).toBeDefined();
        expect(error?.errors?.dangerLevel).toBeDefined();
    });
});
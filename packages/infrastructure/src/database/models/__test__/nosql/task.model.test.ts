import { describe, it, expect } from 'vitest';
import { TaskModel } from '../../nosql/task.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Task Model', () => {
    it('🟢 doit valider une tâche conforme avec toutes ses valeurs requises, par défaut et sous-schémas', () => {
        const validData = {
            uid: 'task_123',
            projectUid: 'project_456',
            creatorUid: 'bird_creator_77',
            content: {
                title: 'Implanter l irrigation par la Sève',
            },
        };

        const task = new TaskModel(validData);
        expect(task.uid).toBe('task_123');
        expect(task.projectUid).toBe('project_456');
        expect(task.creatorUid).toBe('bird_creator_77');
        expect(task.content.title).toBe('Implanter l irrigation par la Sève');
        expect(task.status).toBe('TODO');      // Valeur par défaut
        expect(task.priority).toBe('MEDIUM');  // Valeur par défaut
        expect(task.isIrrigated).toBe(1);      // Valeur par défaut
        expect(task.pomodoros.estimated).toBe(1); // Valeur par défaut
        expect(task.metrics.complexity).toBe(1);  // Valeur par défaut
    });

    it('🔴 doit rejeter une tâche si les champs obligatoires (uid, projectUid, creatorUid, content.title) manquent', () => {
        const invalidData = {
            content: {}, // title manquant
            // uid, projectUid et creatorUid sont omis
        };

        const error = new TaskModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.projectUid).toBeDefined();
        expect(error?.errors?.creatorUid).toBeDefined();
        expect(error?.errors?.['content.title']).toBeDefined();
    });

    it('🔴 doit rejeter une dépendance si ses sous-champs obligatoires (id, status) manquent', () => {
        const invalidData = {
            uid: 'task_789',
            projectUid: 'project_456',
            creatorUid: 'bird_creator_77',
            content: { title: 'Tâche avec dépendance corrompue' },
            dependencies: [
                { id: 'dep_1' } // status manquant
            ]
        };

        const error = new TaskModel(invalidData).validateSync();
        expect(error?.errors?.['dependencies.0.status']).toBeDefined();
    });
});
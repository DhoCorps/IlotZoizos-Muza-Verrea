import { describe, it, expect } from 'vitest';
import { Message } from '../../graph/messages.graph'; // Ajuste le chemin relatif selon ton arborescence

describe('GraphMessage Model', () => {
    it('🟢 doit valider un message du graphe conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            userId: 'bird_user_123',
            content: 'Échange constructif sur la santé mentale.',
        };

        const message = new Message(validData);
        expect(message.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(message.userId).toBe('bird_user_123');
        expect(message.content).toBe('Échange constructif sur la santé mentale.');
        expect(message.context).toBe('general'); // Valeur par défaut
    });

    it('🔴 doit rejeter un message si les champs obligatoires (userId, content) manquent', () => {
        const invalidData = {
            context: 'support',
            // userId et content sont omis
        };

        const error = new Message(invalidData).validateSync();
        expect(error?.errors?.userId).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
    });

    it('🔴 doit rejeter un message avec un context non valide par rapport à l\'énumération', () => {
        const invalidData = {
            userId: 'bird_user_123',
            content: 'Test message',
            context: 'UNKNOWN_CONTEXT', // Invalide
        };

        const error = new Message(invalidData).validateSync();
        expect(error?.errors?.context).toBeDefined();
    });
});
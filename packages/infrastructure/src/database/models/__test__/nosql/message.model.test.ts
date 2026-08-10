import { describe, it, expect } from 'vitest';
import { MessageModel } from '../../nosql/message.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Message Model', () => {
    it('🟢 doit valider un message conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            slug: 'msg_123',
            conversationSlug: 'conv_456',
            senderSlug: 'bird_sender_789',
            content: 'Le chant de la Canopée résonne ce matin.',
        };

        const message = new MessageModel(validData);
        expect(message.slug).toBe('msg_123');
        expect(message.conversationSlug).toBe('conv_456');
        expect(message.senderSlug).toBe('bird_sender_789');
        expect(message.content).toBe('Le chant de la Canopée résonne ce matin.');
        expect(message.isEdited).toBe(false); // Valeur par défaut
        expect(message.isSystemBroadcast).toBe(false); // Valeur par défaut
        expect(message.attachments).toEqual([]);
        expect(message.reactions).toEqual([]);
        expect(message.readBy).toEqual([]);
    });

    it('🔴 doit rejeter un message si les champs obligatoires racine (slug, conversationSlug, senderSlug) manquent', () => {
        const invalidData = {
            content: 'Message orphelin sans identifiants',
        };

        const error = new MessageModel(invalidData).validateSync();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.conversationSlug).toBeDefined();
        expect(error?.errors?.senderSlug).toBeDefined();
    });
});
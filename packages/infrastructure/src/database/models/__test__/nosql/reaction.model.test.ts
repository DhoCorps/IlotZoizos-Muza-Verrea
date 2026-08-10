import { describe, it, expect } from 'vitest';
import { ReactionModel } from '../../nosql/reaction.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Reaction Model', () => {
    it('🟢 doit valider une réaction conforme avec tous ses champs requis et valeurs par défaut', () => {
        const validData = {
            reactionUid: 'react_123',
            targetEntityUid: 'sujet_456',
            targetLabel: 'Sujet',
            senderUid: 'bird_sender_789',
            emoji: '❤️',
        };

        const reaction = new ReactionModel(validData);
        expect(reaction.reactionUid).toBe('react_123');
        expect(reaction.targetEntityUid).toBe('sujet_456');
        expect(reaction.targetLabel).toBe('Sujet');
        expect(reaction.senderUid).toBe('bird_sender_789');
        expect(reaction.emoji).toBe('❤️');
        expect(reaction.createdAt).toBeDefined(); // Valeur par défaut
    });

    it('🔴 doit rejeter une réaction si les champs obligatoires (reactionUid, targetEntityUid, targetLabel, senderUid, emoji) manquent', () => {
        const invalidData = {
            // Tous les champs required sont omis
        };

        const error = new ReactionModel(invalidData).validateSync();
        expect(error?.errors?.reactionUid).toBeDefined();
        expect(error?.errors?.targetEntityUid).toBeDefined();
        expect(error?.errors?.targetLabel).toBeDefined();
        expect(error?.errors?.senderUid).toBeDefined();
        expect(error?.errors?.emoji).toBeDefined();
    });
});
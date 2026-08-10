import { describe, it, expect } from 'vitest';
import { CommentModel } from '../../nosql/comment.model';

describe('Comment Model', () => {
    it('🟢 doit valider un commentaire conforme avec tous ses champs requis', () => {
        const validData = {
            commentUid: 'comm_123',
            targetOwnerUid: 'bird_owner_1',
            targetEntityUid: 'sujet_789',
            targetLabel: 'Sujet',
            authorUid: 'bird_author_2',
            content: 'Magnifique chant, la Canopée résonne de cette mélodie.',
        };

        const comment = new CommentModel(validData);
        expect(comment.commentUid).toBe('comm_123');
        expect(comment.targetOwnerUid).toBe('bird_owner_1');
        expect(comment.targetEntityUid).toBe('sujet_789');
        expect(comment.targetLabel).toBe('Sujet');
        expect(comment.authorUid).toBe('bird_author_2');
        expect(comment.content).toBe('Magnifique chant, la Canopée résonne de cette mélodie.');
        expect(comment.createdAt).toBeDefined();
        expect(comment.updatedAt).toBeDefined();
    });

    it('🔴 doit rejeter un commentaire si les champs obligatoires manquent', () => {
        const invalidData = {
            commentUid: 'comm_456',
            // targetOwnerUid, targetEntityUid, targetLabel, authorUid et content sont manquants
        };

        const error = new CommentModel(invalidData).validateSync();
        expect(error?.errors?.targetOwnerUid).toBeDefined();
        expect(error?.errors?.targetEntityUid).toBeDefined();
        expect(error?.errors?.targetLabel).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
    });
});
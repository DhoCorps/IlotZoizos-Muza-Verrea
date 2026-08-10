import { describe, it, expect } from 'vitest';
import { ModerationRequestSchema } from '@ilot/types';
import { ModerationModel } from '../../nosql/moderation.model';

describe('Moderation Model & Zod', () => {
    it('🟢 doit valider un objet de requête de modération conforme', () => {
        const validData = {
            targetId: 'bird_999',
            targetType: 'USER' as const,
            reason: 'Comportement toxique détecté dans le chat.',
            severity: 'HIGH' as const,
            reportedBy: 'bird_guardian_1',
            context: { channel: 'canopee-general' }
        };

        const zodResult = ModerationRequestSchema.safeParse(validData);
        expect(zodResult.success).toBe(true);

        const moderationDoc = new ModerationModel(validData);
        expect(moderationDoc.targetId).toBe('bird_999');
        expect(moderationDoc.targetType).toBe('USER');
        expect(moderationDoc.severity).toBe('HIGH');
    });

    it('🔴 doit rejeter via Zod une raison trop courte (< 5 caractères)', () => {
        const invalidData = {
            targetId: 'bird_888',
            targetType: 'USER',
            reason: 'Bad', // 3 caractères (< 5) -> Échec Zod garanti
            severity: 'LOW',
        };

        const zodResult = ModerationRequestSchema.safeParse(invalidData);
        expect(zodResult.success).toBe(false);
    });

    it('🔴 doit rejeter via Mongoose si les champs obligatoires (targetId, targetType, reason, severity) manquent ou sont invalides', () => {
        const error = new ModerationModel({
            targetId: 'bird_888',
            targetType: 'INVALID_TYPE', // Invalide pour l'enum Mongoose
            reason: 'Test',
            severity: 'UNKNOWN' // Invalide pour l'enum Mongoose
        }).validateSync();

        expect(error?.errors?.targetType).toBeDefined();
        expect(error?.errors?.severity).toBeDefined();

        const emptyDocError = new ModerationModel({}).validateSync();
        expect(emptyDocError?.errors?.targetId).toBeDefined();
        expect(emptyDocError?.errors?.targetType).toBeDefined();
        expect(emptyDocError?.errors?.reason).toBeDefined();
        expect(emptyDocError?.errors?.severity).toBeDefined();
    });
});
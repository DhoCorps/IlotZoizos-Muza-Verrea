import { describe, it, expect } from 'vitest';
import { RewardModel, RewardEntryModel } from '../../nosql/reward.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Reward Model', () => {
    it('🟢 doit valider une entrée de récompense conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            ownerUid: 'bird_winner_1',
            type: 'TOP_SELLER',
            month: '2026-08',
        };

        const reward = new RewardModel(validData);
        expect(reward.ownerUid).toBe('bird_winner_1');
        expect(reward.type).toBe('TOP_SELLER');
        expect(reward.month).toBe('2026-08');
        expect(reward.isTradable).toBe(true);  // Valeur par défaut
        expect(reward.isConsumed).toBe(false); // Valeur par défaut
        expect(reward.createdAt).toBeDefined();
    });

    it('🟢 doit garantir que RewardModel et RewardEntryModel pointent vers la même référence', () => {
        expect(RewardModel).toBe(RewardEntryModel);
    });

    it('🔴 doit rejeter une récompense si les champs obligatoires (ownerUid, type, month) manquent', () => {
        const invalidData = {
            isTradable: false,
            // Tous les champs required sont omis
        };

        const error = new RewardModel(invalidData).validateSync();
        expect(error?.errors?.ownerUid).toBeDefined();
        expect(error?.errors?.type).toBeDefined();
        expect(error?.errors?.month).toBeDefined();
    });

    it('🔴 doit rejeter une récompense avec un type non valide par rapport à l\'énumération', () => {
        const invalidData = {
            ownerUid: 'bird_winner_1',
            type: 'INVALID_REWARD_TYPE', // Invalide
            month: '2026-08',
        };

        const error = new RewardModel(invalidData).validateSync();
        expect(error?.errors?.type).toBeDefined();
    });
});
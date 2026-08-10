import { describe, it, expect } from 'vitest';
import { GameResultModel } from '../../nosql/gameResult.model'; // Ajuste le chemin relatif selon ton arborescence

describe('GameResult Model', () => {
    it('🟢 doit valider un résultat de jeu conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            username: 'OiseauChanteur',
            gameType: 'WikiOracle',
            score: 1250,
            finalScore: 1300,
            trophies: ['trophy_gold'],
            maxStreak: 5,
        };

        const result = new GameResultModel(validData);
        expect(result.username).toBe('OiseauChanteur');
        expect(result.gameType).toBe('WikiOracle');
        expect(result.score).toBe(1250);
        expect(result.finalScore).toBe(1300);
        expect(result.trophies).toEqual(['trophy_gold']);
        expect(result.maxStreak).toBe(5);
        expect(result.createdAt).toBeDefined();
    });

    it('🔴 doit rejeter un résultat de jeu si les champs obligatoires (username, gameType, score, finalScore) manquent', () => {
        const invalidData = {
            maxStreak: 3,
            // Tous les champs required sont omis
        };

        const error = new GameResultModel(invalidData).validateSync();
        expect(error?.errors?.username).toBeDefined();
        expect(error?.errors?.gameType).toBeDefined();
        expect(error?.errors?.score).toBeDefined();
        expect(error?.errors?.finalScore).toBeDefined();
    });
});
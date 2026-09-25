// Fichier : src/games/quiz/__test__/QuizScoringEngine.test.ts
import { describe, it, expect } from 'vitest';
import { QuizScoringEngine } from '../../games/engine/QuizScoringEngine';
import type { PlayerGameStats } from '@ilot/types';

describe('QuizScoringEngine (Moteur de Score & Trophées)', () => {

    describe('calculateScore', () => {
        it('🟢 doit calculer correctement les points avec un bonus de rapidité maximal et un multiplicateur de base (série 0 -> 1)', () => {
            const currentScore = 0;
            const currentStreak = 0;
            const responseTimeMs = 0; // Réponse instantanée (bonus max = 500)
            const maxTimeMs = 15000;

            const result = QuizScoringEngine.calculateScore(currentScore, currentStreak, responseTimeMs, maxTimeMs);

            // basePoints (1000) * 1.0 (streak 1) + 500 (speed bonus) = 1500
            expect(result.pointsEarned).toBe(1500);
            expect(result.newScore).toBe(1500);
            expect(result.newStreak).toBe(1);
            expect(result.multiplier).toBe(1.0);
            expect(result.iconReward).toBe('🪶');
        });

        it('🟢 doit appliquer les multiplicateurs de série et les icônes progressives (série >= 3, 5, 10)', () => {
            // Test série 3 -> icône '🌱'
            const resStreak3 = QuizScoringEngine.calculateScore(1000, 2, 7500, 15000);
            expect(resStreak3.newStreak).toBe(3);
            expect(resStreak3.multiplier).toBe(1.6); // 1 + (3 - 1) * 0.3 = 1.6
            expect(resStreak3.iconReward).toBe('🌱');

            // Test série 5 -> icône '🔥'
            const resStreak5 = QuizScoringEngine.calculateScore(5000, 4, 0, 15000);
            expect(resStreak5.newStreak).toBe(5);
            expect(resStreak5.multiplier).toBe(2.2); // 1 + 4 * 0.3 = 2.2
            expect(resStreak5.iconReward).toBe('🔥');

            // Test série 10 -> icône '⚡' et plafond du multiplicateur à 3.0
            const resStreak10 = QuizScoringEngine.calculateScore(12000, 9, 0, 15000);
            expect(resStreak10.newStreak).toBe(10);
            expect(resStreak10.multiplier).toBe(3.0); // Plafonné à 3.0 (1 + 9*0.3 = 3.7 -> Math.min(..., 3.0))
            expect(resStreak10.iconReward).toBe('⚡');
        });
    });

    describe('handleIncorrectAnswer', () => {
        it('🟢 doit réinitialiser la série, conserver le score et renvoyer l\'icône d\'échec', () => {
            const currentScore = 2500;
            const result = QuizScoringEngine.handleIncorrectAnswer(currentScore);

            expect(result.pointsEarned).toBe(0);
            expect(result.newScore).toBe(2500);
            expect(result.newStreak).toBe(0);
            expect(result.multiplier).toBe(1.0);
            expect(result.iconReward).toBe('❌');
        });
    });

    describe('evaluateEndOfGameTrophies', () => {
        it('🟢 doit attribuer le trophée "L’Éclair du Ciel" si le temps de réponse moyen est inférieur à 4000ms', () => {
            const playerStats: PlayerGameStats = {
                questionsAnswered: 5,
                correctAnswers: 4,
                maxStreak: 2,
                totalResponseTime: 15000 // Moyenne = 3000ms (< 4000ms)
            } as any;

            const trophies = QuizScoringEngine.evaluateEndOfGameTrophies(playerStats);
            const lightningTrophy = trophies.find(t => t.type === 'LIGHTNING');

            expect(lightningTrophy).toBeDefined();
            expect(lightningTrophy?.title).toBe('L’Éclair du Ciel');
            expect(lightningTrophy?.icon).toBe('⚡');
            expect(lightningTrophy?.id).toBeDefined();
        });

        it('🟢 doit attribuer le trophée "Le Phénix" si la série max est supérieure ou égale à 5', () => {
            const playerStats: PlayerGameStats = {
                questionsAnswered: 10,
                correctAnswers: 8,
                maxStreak: 6, // >= 5
                totalResponseTime: 60000
            } as any;

            const trophies = QuizScoringEngine.evaluateEndOfGameTrophies(playerStats);
            const phoenixTrophy = trophies.find(t => t.type === 'PHOENIX');

            expect(phoenixTrophy).toBeDefined();
            expect(phoenixTrophy?.title).toBe('Le Phénix');
            expect(phoenixTrophy?.icon).toBe('🔥');
        });

        it('🟢 doit attribuer le trophée "L’Œil de Faucon" en cas de sans-faute (100% de bonnes réponses)', () => {
            const playerStats: PlayerGameStats = {
                questionsAnswered: 5,
                correctAnswers: 5, // Égal à questionsAnswered
                maxStreak: 5,
                totalResponseTime: 25000
            } as any;

            const trophies = QuizScoringEngine.evaluateEndOfGameTrophies(playerStats);
            const hawkEyeTrophy = trophies.find(t => t.type === 'HAWK_EYE');

            expect(hawkEyeTrophy).toBeDefined();
            expect(hawkEyeTrophy?.title).toBe('L’Œil de Faucon');
            expect(hawkEyeTrophy?.icon).toBe('🎯');
        });

        it('🟢 ne doit attribuer aucun trophée si les performances ne remplissent pas les critères', () => {
            const playerStats: PlayerGameStats = {
                questionsAnswered: 5,
                correctAnswers: 2,
                maxStreak: 1,
                totalResponseTime: 50000 // Moyenne 10s (> 4s), série max < 5, erreurs commises
            } as any;

            const trophies = QuizScoringEngine.evaluateEndOfGameTrophies(playerStats);
            expect(trophies).toEqual([]);
        });
    });
});
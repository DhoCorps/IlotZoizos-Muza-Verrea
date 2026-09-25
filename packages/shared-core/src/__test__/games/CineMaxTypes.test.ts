// Fichier : packages/shared-core/src/games/cinemax/__test__/CineMaxTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    CineMaxQuestion,
    CineMaxPlayer,
    CineMaxGameOptions,
    CineMaxGameRoom
} from '../../games/cinemax/CineMaxTypes';

describe('CineMax Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: CineMaxQuestion doit valider la structure d\'une énigme cinématographique', () => {
            const question: CineMaxQuestion = {
                id: 'q_123',
                type: 'ACTOR_FACE',
                difficulty: 4,
                questionText: 'Quel est cet acteur masqué ?',
                imageUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
                options: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
                correctAnswer: 'Keanu Reeves'
            };

            expect(question.type).toBe('ACTOR_FACE');
            expect(question.difficulty).toBe(4);
            expect(question.options.length).toBe(4);
        });

        it('🟢 TYPE CHECK: CineMaxGameOptions doit accepter les limites strictes du projecteur', () => {
            const options: CineMaxGameOptions = {
                nbPlayer: 'quad',
                timePerRound: 45,
                scoreToWin: 150,
                difficultyRule: 'PLAYER_CHOICE',
                maxRounds: 10
            };

            expect(options.nbPlayer).toBe('quad');
            expect(options.scoreToWin).toBe(150);
            expect(options.difficultyRule).toBe('PLAYER_CHOICE');
        });

        it('🟢 TYPE CHECK: CineMaxGameRoom doit intégrer l\'obscurité de la salle et l\'état du round', () => {
            const room: CineMaxGameRoom = {
                gameType: 'CineMax',
                id: 'room_cine_1',
                name: 'Ciné Club',
                state: 'playing',
                round: 1,
                maxPlayers: 4,
                scores: { 'player_1': 10 },
                players: [
                    {
                        id: 'player_1',
                        socketId: 'sock_1',
                        username: 'CineDirector',
                        roomId: 'room_cine_1',
                        status: 'playing',
                        isReady: true,
                        score: 10,
                        gameType: 'CineMax',
                        errorCount: 0,
                        isBuzzerLocked: false,
                        currentQuestion: null,
                        pendingDifficultyChoice: false
                    }
                ],
                gameOptions: {
                    nbPlayer: 'duo',
                    timePerRound: 30,
                    scoreToWin: 100,
                    difficultyRule: 'SERVER_CHAOS',
                    maxRounds: 5
                },
                targetMovieId: 'tt0133093',
                targetMovieTitle: 'The Matrix',
                targetMoviePoster: 'https://image.tmdb.org/t/p/w500/matrix.jpg',
                pelliculeBlur: 100,
                roundTimerInterval: null,
                currentRoundTimeLeft: 30,
                winnerId: null,
                buzzerWinnerId: null
            };

            expect(room.gameType).toBe('CineMax');
            expect(room.targetMovieTitle).toBe('The Matrix');
            expect(room.pelliculeBlur).toBe(100);
            expect(room.players.length).toBe(1);
            expect(room.players[0].errorCount).toBe(0);
        });
    });
});
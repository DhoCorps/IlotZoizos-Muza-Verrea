// Fichier : packages/shared-core/src/games/wikiOracle/__test__/WikiOracleTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    WikiOracleArticle,
    QuizQuestion,
    WikiOraclePlayer,
    WikiOracleGameRoom
} from '../../games/wikiOracle/WikiOracleTypes';

describe('WikiOracle Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: WikiOracleArticle doit structurer les informations extraites de Wikipédia', () => {
            const article: WikiOracleArticle = {
                title: 'Alan Turing',
                extract: 'Mathématicien et cryptologue britannique.',
                description: 'Pionnier de l\'informatique',
                thumbnail: { source: 'https://upload.wikimedia.org/wikipedia/commons/turing.jpg' },
                content_urls: { desktop: { page: 'https://fr.wikipedia.org/wiki/Alan_Turing' } }
            };

            expect(article.title).toBe('Alan Turing');
            expect(article.description).toBe('Pionnier de l\'informatique');
            expect(article.thumbnail?.source).toBeDefined();
        });

        it('🟢 TYPE CHECK: QuizQuestion doit lier la question cible aux indices progressifs', () => {
            const question: QuizQuestion = {
                questionTitle: 'Alan Turing',
                correctAnswer: 'Alan Turing',
                options: ['Alan Turing', 'Ada Lovelace', 'John von Neumann', 'Claude Shannon'],
                hints: [
                    'Indice immédiat : Né à Londres en 1912.',
                    'Indice à 10s : Machine Enigma.',
                    'Indice à 20s : Test de Turing.'
                ],
                imageUrl: 'https://upload.wikimedia.org/...',
                wikiUrl: 'https://fr.wikipedia.org/wiki/Alan_Turing'
            };

            expect(question.correctAnswer).toBe('Alan Turing');
            expect(question.hints.length).toBe(3);
            expect(question.options.length).toBe(4);
        });

        it('🟢 TYPE CHECK: WikiOraclePlayer doit intégrer le niveau d\'indice actuel du joueur', () => {
            const player: WikiOraclePlayer = {
                id: 'player_1',
                socketId: 'sock_wiki_1',
                username: 'OrateurSage',
                roomId: 'room_wiki_1',
                status: 'playing',
                isReady: true,
                score: 350,
                currentHintLevel: 1
            };

            expect(player.currentHintLevel).toBe(1);
            expect(player.score).toBe(350);
        });

        it('🟢 TYPE CHECK: WikiOracleGameRoom doit encapsuler l\'état global du jeu, les intervalles et les ensembles de suivi (Sets)', () => {
            const room: WikiOracleGameRoom = {
                gameType: 'WikiOracle',
                id: 'room_wiki_1',
                name: 'Sanctuaire du Savoir',
                state: 'playing',
                round: 1,
                maxPlayers: 8,
                scores: { 'player_1': 350 },
                players: [],
                winnerId: null,
                choicesMode: '4',
                theme: 'science',
                currentRoundTimeLeft: 25,
                roundTimerInterval: null,
                hintRevealInterval: null,
                currentQuestion: {
                    questionTitle: 'Alan Turing',
                    correctAnswer: 'Alan Turing',
                    options: ['Alan Turing', 'Autre'],
                    hints: ['Indice 1']
                },
                currentHintLevel: 0,
                playersAnsweredThisRound: new Set(['player_1']),
                correctAnswerGivenThisRound: false
            };

            expect(room.gameType).toBe('WikiOracle');
            expect(room.choicesMode).toBe('4');
            expect(room.theme).toBe('science');
            expect(room.playersAnsweredThisRound.has('player_1')).toBe(true);
        });
    });
});
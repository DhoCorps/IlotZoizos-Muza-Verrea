// Fichier : packages/shared-core/src/games/plumzee/__test__/PlumZeeTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    PlumZeeSymbolMeta,
    PlumZeeDie,
    PlumZeePlayerScoreSheet,
    PlumZeePlayer,
    PlumZeeGameOptions,
    PlumZeeGameRoom
} from '../../games/plumzee/PlumZeeTypes';

describe('PlumZee Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: PlumZeeSymbolMeta doit définir l\'apparence d\'un symbole de dé', () => {
            const meta: PlumZeeSymbolMeta = {
                id: 1,
                name: 'Plume',
                icon: '🪶',
                color: '#E0E0E0'
            };

            expect(meta.id).toBe(1);
            expect(meta.icon).toBe('🪶');
        });

        it('🟢 TYPE CHECK: PlumZeeDie doit suivre l\'état de verrouillage et la valeur d\'un dé', () => {
            const die: PlumZeeDie = {
                id: 0,
                value: 5,
                isLocked: true
            };

            expect(die.value).toBe(5);
            expect(die.isLocked).toBe(true);
        });

        it('🟢 TYPE CHECK: PlumZeePlayerScoreSheet doit accepter les combinaisons de score', () => {
            const scoreSheet: PlumZeePlayerScoreSheet = {
                'FEATHER': 15,
                'PLUMZEE': 50,
                'VENT_LIBRE': null
            };

            expect(scoreSheet['FEATHER']).toBe(15);
            expect(scoreSheet['PLUMZEE']).toBe(50);
            expect(scoreSheet['VENT_LIBRE']).toBeNull();
        });

        it('🟢 TYPE CHECK: PlumZeePlayer doit encapsuler l\'état du joueur et sa feuille de score', () => {
            const player: PlumZeePlayer = {
                id: 'p1',
                socketId: 'sock_plum_1',
                username: 'OiseauJoueur',
                roomId: 'room_plum_1',
                status: 'connected',
                isReady: true,
                scoreSheet: { 'FEATHER': 10 },
                score: 10,
                totalScore: 65,
                rollsLeft: 2,
                hasFinished: false
            };

            expect(player.score).toBe(10);
            expect(player.rollsLeft).toBe(2);
            expect(player.hasFinished).toBe(false);
        });

        it('🟢 TYPE CHECK: PlumZeeGameOptions doit structurer les règles de temps et de tours', () => {
            const options: PlumZeeGameOptions = {
                maxRounds: 13,
                turnTimeLimitSec: 45
            };

            expect(options.maxRounds).toBe(13);
            expect(options.turnTimeLimitSec).toBe(45);
        });

        it('🟢 TYPE CHECK: PlumZeeGameRoom doit intégrer le plateau de dés et les options de la partie', () => {
            const room: PlumZeeGameRoom = {
                gameType: 'PlumZee',
                id: 'room_plum_1',
                name: 'Nid de Dés',
                state: 'playing',
                round: 1,
                maxPlayers: 4, // 👈 Unique déclaration ici
                scores: { 'p1': 10 },
                players: [],
                winnerId: null,
                gameOptions: {
                    maxRounds: 13,
                    turnTimeLimitSec: 60
                },
                currentTurnPlayerId: 'p1',
                currentRound: 1,
                currentDice: [
                    { id: 0, value: 1, isLocked: false },
                    { id: 1, value: 2, isLocked: true }
                ],
                roundStartTime: Date.now()
            };

            expect(room.gameType).toBe('PlumZee');
            expect(room.currentDice.length).toBe(2);
            expect(room.gameOptions.turnTimeLimitSec).toBe(60);
        });
    });
});
// Fichier : packages/shared-core/src/games/galaktk/__test__/GalakTKTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    GalakTKGameOptions,
    GalakTKPlayer,
    GalakTKGameRoom,
    GalakTKMoveResult
} from '../../games/galak-t-k/GalakTKTypes';

describe('GalakTK Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: GalakTKGameOptions doit valider les dimensions et options de la grille', () => {
            const options: GalakTKGameOptions = {
                gridWidth: 10,
                gridHeight: 10,
                totalStars: 5,
                mode: 'local',
                gridSize: 'medium'
            };

            expect(options.gridWidth).toBe(10);
            expect(options.mode).toBe('local');
            expect(options.gridSize).toBe('medium');
        });

        it('🟢 TYPE CHECK: GalakTKPlayer doit structurer l\'état et le suivi personnel du joueur', () => {
            const player: GalakTKPlayer = {
                id: 'player_1',
                socketId: 'sock_galak_1',
                username: 'Astronaute',
                roomId: 'room_galak_1',
                status: 'connected',
                isReady: true,
                score: 100,
                starsFoundCount: 2,
                turnsTaken: 5,
                startTime: Date.now(),
                totalTimeMs: 12000,
                markedCells: [{ x: 3, y: 4, status: 'star' }],
                foundStarPositions: [{ x: 1, y: 2 }]
            };

            expect(player.score).toBe(100);
            expect(player.markedCells[0].status).toBe('star');
            expect(player.foundStarPositions.length).toBe(1);
        });

        it('🟢 TYPE CHECK: GalakTKGameRoom doit encapsuler l\'état global de la partie Galak-T-K', () => {
            const room: GalakTKGameRoom = {
                gameType: 'GalakTK',
                id: 'room_galak_1',
                name: 'Nébuleuse',
                state: 'playing',
                round: 1,
                maxPlayers: 2,
                scores: { 'player_1': 100 },
                players: [],
                gameOptions: {
                    gridWidth: 8,
                    gridHeight: 8,
                    totalStars: 3,
                    mode: 'global',
                    gridSize: 'small'
                },
                stars: [{ x: 1, y: 1 }, { x: 5, y: 5 }, { x: 7, y: 2 }],
                currentTurnPlayerId: 'player_1',
                roundStartTime: Date.now(),
                winnerId: null
            };

            expect(room.gameType).toBe('GalakTK');
            expect(room.stars.length).toBe(3);
            expect(room.gameOptions.gridSize).toBe('small');
        });

        it('🟢 TYPE CHECK: GalakTKMoveResult doit valider les résultats de déplacement ou de scan', () => {
            const moveResult: GalakTKMoveResult = {
                type: 'AXIS_COUNT',
                position: { x: 3, y: 3 },
                count: 2
            };

            expect(moveResult.type).toBe('AXIS_COUNT');
            expect(moveResult.count).toBe(2);

            const foundResult: GalakTKMoveResult = {
                type: 'STAR_FOUND',
                position: { x: 1, y: 1 }
            };

            expect(foundResult.type).toBe('STAR_FOUND');
            expect(foundResult.count).toBeUndefined();
        });
    });
});
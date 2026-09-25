// Fichier : src/games/crazymorpion/__test__/CrazyMorpionTypes.test.ts
import { describe, it, expect } from 'vitest';
import {
    CRAZYMORPION_SYMBOL_EMPTY,
    CRAZYMORPION_SYMBOL_PLUS,
    CRAZYMORPION_SYMBOL_MINUS,
    CRAZYMORPION_SYMBOL_STAR,
    CRAZYMORPION_SYMBOL_EQUAL,
    CrazyMorpionGrid,
    CrazyMorpionPlayer,
    CrazyMorpionGameRoom
} from '../../games/crazymorpion/CrazyMorpionTypes';

describe('CrazyMorpion Types & Constants', () => {

    // ==========================================
    // 1. TESTS RUNTIME (Constantes et Symboles)
    // ==========================================
    describe('1. Tests d\'exécution (Runtime)', () => {
        it('🟢 doit exposer les symboles officiels du jeu CrazyMorpion', () => {
            expect(CRAZYMORPION_SYMBOL_EMPTY).toBe('');
            expect(CRAZYMORPION_SYMBOL_PLUS).toBe('+');
            expect(CRAZYMORPION_SYMBOL_MINUS).toBe('-');
            expect(CRAZYMORPION_SYMBOL_STAR).toBe('*');
            expect(CRAZYMORPION_SYMBOL_EQUAL).toBe('=');
        });
    });

    // ==========================================
    // 2. CONTRATS DE TYPES STATIQUES (Type Assertions)
    // ==========================================
    describe('2. Contrats de Types Statiques (Compilation Check)', () => {
        
        it('🟢 TYPE CHECK: CrazyMorpionGrid doit accepter un plateau 2D de chaînes ou undefined', () => {
            const grid: CrazyMorpionGrid = [
                ['+', '-', '*'],
                ['=', '+', ''],
                ['-', '*', '=']
            ];
            
            const emptyGrid: CrazyMorpionGrid = undefined;

            expect(grid?.[0][0]).toBe('+');
            expect(emptyGrid).toBeUndefined();
        });

        it('🟢 TYPE CHECK: CrazyMorpionPlayer doit exiger un symbole obligatoire', () => {
            const player: CrazyMorpionPlayer = {
                id: 'p1',
                socketId: 'sock_1',
                username: 'MorpionMaster',
                roomId: 'room_morpion_1',
                status: 'playing',
                isReady: true,
                score: 5,
                symbol: CRAZYMORPION_SYMBOL_PLUS,
                gameType: 'CrazyMorpion'
            };

            expect(player.symbol).toBe('+');
            expect(player.gameType).toBe('CrazyMorpion');
        });

        it('🟢 TYPE CHECK: CrazyMorpionGameRoom doit structurer la salle de jeu et ses timers de déconnexion', () => {
            const room: CrazyMorpionGameRoom = {
                gameType: 'CrazyMorpion',
                id: 'room_morpion_1',
                name: 'Morpion Express',
                state: 'playing',
                round: 1,
                maxPlayers: 2,
                scores: { 'p1': 0, 'p2': 0 },
                players: [
                    {
                        id: 'p1',
                        socketId: 'sock_1',
                        username: 'Player1',
                        roomId: 'room_morpion_1',
                        status: 'playing',
                        isReady: true,
                        score: 0,
                        symbol: '+',
                        gameType: 'CrazyMorpion'
                    }
                ],
                grid: [
                    ['+', '', ''],
                    ['', '', ''],
                    ['', '', '']
                ],
                currentTurnPlayerId: 'p1',
                winnerId: null,
                winningCells: null,
                turnPassTimer: 30,
                playerDisconnectTimers: new Map()
            };

            expect(room.gameType).toBe('CrazyMorpion');
            expect(room.state).toBe('playing');
            expect(room.players[0].symbol).toBe('+');
            expect(room.turnPassTimer).toBe(30);
            expect(room.playerDisconnectTimers).toBeInstanceOf(Map);
        });
    });
});
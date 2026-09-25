// Fichier : packages/shared-core/src/games/soonart/__test__/SoonArtTypes.test.ts
import { describe, it, expect } from 'vitest';
import type {
    Point,
    CircleSelection,
    Treasure,
    PlayerGuess,
    SoonArtGameOptions,
    SoonArtPlayer,
    SoonArtGameRoom
} from '../../games/soonart/SoonArtTypes';

describe('SoonArt Types & Contracts', () => {

    describe('Contrats de Types Statiques (Compilation Check)', () => {

        it('🟢 TYPE CHECK: Point doit définir des coordonnées x et y', () => {
            const pt: Point = { x: 150, y: 300 };
            expect(pt.x).toBe(150);
            expect(pt.y).toBe(300);
        });

        it('🟢 TYPE CHECK: CircleSelection doit structurer un cercle de scan avec sa densité de trésors', () => {
            const circle: CircleSelection = {
                id: 'circle_1',
                playerId: 'p1',
                center: { x: 500, y: 500 },
                radius: 120,
                treasureCount: 2,
                colorScheme: '#FF5733'
            };

            expect(circle.radius).toBe(120);
            expect(circle.treasureCount).toBe(2);
        });

        it('🟢 TYPE CHECK: Treasure doit représenter un trésor caché sur la carte', () => {
            const treasure: Treasure = {
                id: 't1',
                position: { x: 450, y: 480 },
                isDiscovered: false
            };

            expect(treasure.isDiscovered).toBe(false);
            expect(treasure.position.x).toBe(450);
        });

        it('🟢 TYPE CHECK: PlayerGuess doit structurer le repère posé par un joueur', () => {
            const guess: PlayerGuess = {
                id: 'g1',
                playerId: 'p1',
                position: { x: 452, y: 479 },
                matchedTreasureId: 't1',
                accuracyScore: 95
            };

            expect(guess.accuracyScore).toBe(95);
            expect(guess.matchedTreasureId).toBe('t1');
        });

        it('🟢 TYPE CHECK: SoonArtGameOptions doit fixer les dimensions de la carte et les limites de jeu', () => {
            const options: SoonArtGameOptions = {
                mapWidth: 1000,
                mapHeight: 1000,
                totalTreasures: 5,
                maxCircles: 3
            };

            expect(options.mapWidth).toBe(1000);
            expect(options.maxCircles).toBe(3);
        });

        it('🟢 TYPE CHECK: SoonArtPlayer doit encapsuler le score et les cercles utilisés par le joueur', () => {
            const player: SoonArtPlayer = {
                id: 'p1',
                socketId: 'sock_soon_1',
                username: 'ArtisteChercheur',
                roomId: 'room_soon_1',
                status: 'connected',
                isReady: true,
                score: 250,
                circlesUsed: 2,
                guesses: [],
                gameType: 'SoonArt'
            };

            expect(player.gameType).toBe('SoonArt');
            expect(player.circlesUsed).toBe(2);
        });

       it('🟢 TYPE CHECK: SoonArtGameRoom doit intégrer les trésors, cercles et les timers de phase', () => {
            const room: SoonArtGameRoom = {
                gameType: 'SoonArt',
                id: 'room_soon_1',
                name: 'Atelier de la Carte',
                state: 'scanning',
                round: 1,
                maxPlayers: 4,
                scores: { 'p1': 250 },
                players: [],
                winnerId: null,
                gameOptions: {
                    mapWidth: 1000,
                    mapHeight: 1000,
                    totalTreasures: 5,
                    maxCircles: 3
                },
                treasures: [
                    { id: 't1', position: { x: 200, y: 200 }, isDiscovered: false }
                ],
                treasuresCount: 1, // 🚀 Ajouté pour satisfaire SoonArtRoomToSend
                circles: [],
                scanTimeLeft: 30,
                markTimeLeft: 15
            };

            expect(room.gameType).toBe('SoonArt');
            expect(room.state).toBe('scanning');
            expect(room.treasures.length).toBe(1);
            expect(room.scanTimeLeft).toBe(30);
        });
    });
});
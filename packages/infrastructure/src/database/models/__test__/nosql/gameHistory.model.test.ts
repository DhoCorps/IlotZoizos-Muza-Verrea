import { describe, it, expect } from 'vitest';
import { GameHistoryModel } from '../../nosql/gameHistory.model';

describe('GameHistory Model', () => {
    it('🟢 doit valider un historique de partie conforme avec tous ses champs et valeurs par défaut', () => {
        const validData = {
            gameType: 'CrazyMorpion',
            roomId: 'room_abc123',
            startedAt: new Date('2026-06-01T10:00:00Z'),
            endedAt: new Date('2026-06-01T10:15:00Z'),
            durationSeconds: 900,
            players: [
                {
                    uid: 'bird_1',
                    pseudo: 'PiafGagnant',
                    score: 100,
                    isWinner: true,
                },
                {
                    uid: 'bird_2',
                    pseudo: 'PiafPerdant',
                    score: 40,
                    isWinner: false,
                }
            ],
            matchMetadata: { mode: 'ranked' }
        };

        const history = new GameHistoryModel(validData);
        expect(history.gameType).toBe('CrazyMorpion');
        expect(history.roomId).toBe('room_abc123');
        expect(history.durationSeconds).toBe(900);
        expect(history.players).toHaveLength(2);
        expect(history.endedAt).toBeDefined();
    });

    it('🔴 doit rejeter un historique si les champs obligatoires (gameType, roomId) manquent', () => {
        const invalidData = {
            matchMetadata: {},
        };

        const error = new GameHistoryModel(invalidData).validateSync();
        expect(error?.errors?.gameType).toBeDefined();
        expect(error?.errors?.roomId).toBeDefined();
    });

    it('🔴 doit rejeter un historique avec un gameType non valide par rapport à l\'énumération', () => {
        const invalidData = {
            gameType: 'JeuInconnuDeLaCanopée', // Invalide
            roomId: 'room_xyz',
            startedAt: new Date(),
            endedAt: new Date(),
            durationSeconds: 300,
            players: [
                { uid: 'bird_1', pseudo: 'Test', score: 10, isWinner: true }
            ]
        };

        const error = new GameHistoryModel(invalidData).validateSync();
        expect(error?.errors?.gameType).toBeDefined();
    });
});
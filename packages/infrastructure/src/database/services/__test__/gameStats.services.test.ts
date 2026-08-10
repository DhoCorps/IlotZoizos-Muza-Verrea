import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStatsService } from '../gameStats.service';
import { GameHistoryModel } from '../../models/nosql/gameHistory.model';
import { TransactionManager } from '../../../../../shared-core/src/sync-engine/transactionManager';

// Mock de MongoDB Model
vi.mock('../../models/nosql/gameHistory.model', () => {
    return {
        GameHistoryModel: vi.fn().mockImplementation((data) => ({
            ...data,
            save: vi.fn().mockResolvedValue(true),
        })),
    };
});

// Mock du TransactionManager pour simuler l'exécution atomique Mongo + Neo4j
vi.mock('../../../../../shared-core/src/sync-engine/transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn(),
    },
}));

describe('GameStatsService (Le Suivi des Mini-Jeux & du Graphe)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('recordMatch', () => {
        it('🟢 doit enregistrer une partie avec succès, sauvegarder dans Mongo et propager dans Neo4j', async () => {
            const mockMatchData: any = {
                roomId: 'room_123',
                gameType: 'KOPY',
                durationSeconds: 300,
                players: [
                    { uid: 'bird_winner_1', isWinner: true },
                    { uid: 'bird_loser_1', isWinner: false },
                ],
            };

            // On simule le callback exécuté par TransactionManager
            vi.mocked(TransactionManager.execute).mockImplementation(async (_desc, callback) => {
                const mockMongoSession = {} as any;
                const mockNeo4jTx = {
                    run: vi.fn().mockResolvedValue({ records: [] }),
                };
                return await callback(mockMongoSession, mockNeo4jTx as any);
            });

            const result = await GameStatsService.recordMatch(mockMatchData);

            expect(result).toBe(true);
            expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
            expect(GameHistoryModel).toHaveBeenCalledWith(mockMatchData);
        });

        it('🔴 doit retourner false si une erreur survient lors de la transaction atomique', async () => {
            const mockMatchData: any = {
                roomId: 'room_456',
                gameType: 'PLAJIA',
                durationSeconds: 150,
                players: [{ uid: 'bird_1', isWinner: true }],
            };

            // Simulation d'une erreur critique dans la transaction
            vi.mocked(TransactionManager.execute).mockRejectedValueOnce(new Error('Erreur de synchronisation atomique'));

            const result = await GameStatsService.recordMatch(mockMatchData);

            expect(result).toBe(false);
            expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
        });
    });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStatsService } from '../gameStats.service';
import { GameHistoryModel } from '../../models/nosql/gameHistory.model';
import { TransactionManager } from '../../../../../shared-core/src/sync-engine/transactionManager';

describe('GameStatsService (Le Suivi des Mini-Jeux & du Graphe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 🛡️ SUTURE : Espionnage propre du TransactionManager
    vi.spyOn(TransactionManager, 'execute').mockImplementation(async (_name, callback) => {
      const mockMongoSession = {} as any;
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) };
      return await callback(mockMongoSession, mockNeo4jTx as any);
    });

    // 🛡️ SUTURE : Espionnage propre du modèle Mongoose
    // On espionne le constructeur et la méthode prototype 'save'
    vi.spyOn(GameHistoryModel.prototype, 'save').mockResolvedValue(true);
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

      const result = await GameStatsService.recordMatch(mockMatchData);

      expect(result).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
      // Vérifie que le constructeur a été appelé (via l'espion prototype)
      expect(GameHistoryModel.prototype.save).toHaveBeenCalled();
    });

    it('🔴 doit retourner false si une erreur survient lors de la transaction atomique', async () => {
      const mockMatchData: any = {
        roomId: 'room_456',
        gameType: 'PLAJIA',
        durationSeconds: 150,
        players: [{ uid: 'bird_1', isWinner: true }],
      };

      // Force l'échec de la transaction
      vi.spyOn(TransactionManager, 'execute').mockRejectedValueOnce(new Error('Erreur de synchronisation atomique'));

      const result = await GameStatsService.recordMatch(mockMatchData);

      expect(result).toBe(false);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });
});
// packages/infrastructure/src/services/gameStats.service.ts
import { GameMatchLog } from '../../../../types/src/core/gameHistory.types';
import { GameHistoryModel } from '../models/nosql/gameHistory.model';
import { TransactionManager } from '../../../../shared-core/src/sync-engine/transactionManager';
import { ClientSession } from 'mongoose';
import { Transaction } from 'neo4j-driver';

export class GameStatsService {
  
  /**
   * Enregistre la fin d'une partie de manière atomique (Mongo + Neo4j)
   */
  public static async recordMatch(matchData: GameMatchLog): Promise<boolean> {
    try {
      await TransactionManager.execute(
        `Enregistrement Match ${matchData.gameType} (${matchData.roomId})`,
        async (mongoSession: ClientSession, neo4jTx: Transaction) => {
          
          // 1. Sauvegarde l'historique complet dans MongoDB
          const newMatch = new GameHistoryModel(matchData);
          await newMatch.save({ session: mongoSession });

          // 2. Tissage des relations dans Neo4j
          // On identifie les gagnants et les perdants
          const winners = matchData.players.filter(p => p.isWinner);
          const losers = matchData.players.filter(p => !p.isWinner);

          // Si on a des vainqueurs et des perdants clairs (pas de match nul complet)
          if (winners.length > 0 && losers.length > 0) {
            
            // Pour chaque gagnant, on crée un lien "A_VAINCU" vers chaque perdant
            for (const winner of winners) {
              for (const loser of losers) {
                const cypher = `
                  MATCH (v:Oiseau {uid: $winnerUid})
                  MATCH (p:Oiseau {uid: $loserUid})
                  MERGE (v)-[r:A_VAINCU {game: $gameType}]->(p)
                  ON CREATE SET r.count = 1, r.lastMatch = datetime()
                  ON MATCH SET r.count = r.count + 1, r.lastMatch = datetime()
                `;
                await neo4jTx.run(cypher, {
                  winnerUid: winner.uid,
                  loserUid: loser.uid,
                  gameType: matchData.gameType
                });
              }
            }
          }

          // 3. Mise à jour de l'expérience/temps de jeu de tous les participants
          for (const player of matchData.players) {
            const expCypher = `
              MATCH (o:Oiseau {uid: $uid})
              SET o.totalPlayTime = coalesce(o.totalPlayTime, 0) + $duration,
                  o.matchesPlayed = coalesce(o.matchesPlayed, 0) + 1
            `;
            await neo4jTx.run(expCypher, {
              uid: player.uid,
              duration: matchData.durationSeconds
            });
          }

          return true; // Tout s'est bien passé
        }
      );
      
      return true;

    } catch (error) {
      console.error(`[GameStatsService] Échec de l'archivage de la partie :`, error);
      return false;
    }
  }
}
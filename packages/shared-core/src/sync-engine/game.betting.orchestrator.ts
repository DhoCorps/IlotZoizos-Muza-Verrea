// packages/shared-core/src/sync-engine/game.betting.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { TaskModel, WalletModel } from '../../../infrastructure';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { IlotError } from '../errors/ilot.errors';
import { IAssetValue } from '@ilot/types';
import crypto from 'crypto';

export class BettingOrchestrator {
  public static async placeBet(userId: string, gameId: string, bets: IAssetValue[], targets: IAssetValue[]) {
    return await TransactionManager.execute("Pari Sécurisé d'Actif avec Réserve", async (mongoSession, neo4jTx) => {
      
      // 1. VERIFICATION ET VERROUILLAGE DES ACTIFS
      for (const bet of bets) {
        if (bet.type === 'TASK' && bet.entityId) {
          const task = await TaskModel.findOneAndUpdate(
            { uid: bet.entityId, creatorUid: userId, status: { $ne: 'LOCKED' } },
            { $set: { status: 'LOCKED' } },
            { new: true }
          ).session(mongoSession).exec();

          if (!task) {
            throw new IlotError(`Atome introuvable ou déjà engagé : ${bet.entityId}`, "FORBIDDEN", 403);
          }
        } else if (bet.type === 'KAOS' || bet.type === 'TOX' || bet.type === 'DHO') {
          const wallet = await WalletModel.findOne({ userId }).session(mongoSession);
          if (!wallet || wallet.balance < bet.amount) {
            throw new IlotError("Fonds insuffisants", "FORBIDDEN", 403);
          }
          wallet.balance -= bet.amount;
          await wallet.save({ session: mongoSession });
        }
      }

      // 2. LOGIQUE DE JEU (RNG Sécurisé)
      const rng = crypto.randomInt(0, 10000);
      const isWinner = rng > 5000;

      // 3. RESOLUTION DES GAINS OU ALIMENTATION DE LA BANQUE CENTRALE
      if (isWinner) {
        for (const target of targets) {
          if (target.type === 'TOX' || target.type === 'DHO' || target.type === 'KAOS') {
            await WalletModel.findOneAndUpdate(
              { userId }, 
              { $inc: { balance: target.amount } }, 
              { session: mongoSession, upsert: true }
            );
          }
        }
      } else {
        // 🦅 CONSCIENCE DE L'ÎLOT : Les pertes alimentent la Trésorerie de la Canopée
        for (const bet of bets) {
          if (bet.type === 'TOX' || bet.type === 'DHO') {
            await KomptaLedgerOrchestrator.transfer({
              fromUid: userId,
              toUid: 'system_canopy_treasury', // La Banque Centrale de l'Îlot
              amount: bet.amount,
              currency: bet.type as any,
              category: 'CANOPY_TAX_REVENUE',
              referenceUid: `lost_bet_${gameId}_${Date.now()}`,
              description: `Alimentation de la Réserve de la Canopée suite à un pari perdu`
            });
          } else if (bet.type === 'TASK' && bet.entityId) {
            // Si c'est un atome/tâche qui est perdu, on peut l'archiver dans le coffre de la banque
            await TaskModel.findOneAndUpdate(
              { uid: bet.entityId },
              { $set: { status: 'ARCHIVED_BY_CANOPY', ownerUid: 'system_canopy_treasury' } },
              { session: mongoSession }
            );
          }
        }
      }

      // 4. Tissage Neo4j
      await neo4jTx.run(`
        MERGE (u:User {uid: $userId})
        MERGE (g:Game {id: $gameId})
        MERGE (u)-[r:PLAYED_GAME]->(g)
        ON CREATE SET r.totalBets = 1, r.totalWins = CASE WHEN $isWinner THEN 1 ELSE 0 END
        ON MATCH SET r.totalBets = r.totalBets + 1, r.totalWins = r.totalWins + CASE WHEN $isWinner THEN 1 ELSE 0 END
      `, { userId, gameId, isWinner });

      return { isWinner, results: isWinner ? targets : [] };
    });
  }
}
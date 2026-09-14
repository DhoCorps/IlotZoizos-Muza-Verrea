import { TransactionManager } from './transactionManager';
import { TaskModel, WalletModel, BankReserve } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { IlotError } from '../errors/ilot.errors';
import { IAssetValue } from '@ilot/types';
import crypto from 'crypto';

const DIFFICULTY_MULTIPLIERS: Record<string, number> = { Initiate: 0.5, Artisan: 1.0, Maestro: 2.0 };
const DECAY_CONSTANT_K = 0.1;

export class BettingOrchestrator {
  
  // ======================================================================
  // 1. MÉTHODE HISTORIQUE (Préservée pour tes Atomes et le mode Classique)
  // ======================================================================
  public static async placeBet(
    userId: string, 
    gameId: string, 
    bets: IAssetValue[], 
    targets: IAssetValue[],
    gameContext: { mode: 'solo' | 'multiplayer'; difficulty: 'Initiate' | 'Artisan' | 'Maestro' } = { mode: 'multiplayer', difficulty: 'Artisan' }
  ) {
    return await TransactionManager.execute("Pari Sécurisé", async (mongoSession, neo4jTx) => {
      
      for (const bet of bets) {
        if (bet.type === 'TASK' && bet.entityId) {
          const task = await TaskModel.findOneAndUpdate(
            { uid: bet.entityId, creatorUid: userId, status: { $ne: 'LOCKED' } },
            { $set: { status: 'LOCKED' } }, { new: true }
          ).session(mongoSession).exec();
          if (!task) throw new IlotError(`Atome introuvable ou déjà engagé : ${bet.entityId}`, "FORBIDDEN", 403);
        } else if (['KAOS', 'TOX', 'DHO'].includes(bet.type)) {
          const wallet = await WalletModel.findOne({ userId }).session(mongoSession);
          if (!wallet || wallet.balance < bet.amount) throw new IlotError("Fonds insuffisants", "FORBIDDEN", 403);
          wallet.balance -= bet.amount;
          await wallet.save({ session: mongoSession });
        }
      }

      const rng = crypto.randomInt(0, 10000);
      const isWinner = rng > 5000;

      const neo4jResponse = await neo4jTx.run(`
        MATCH (u:User {uid: $userId})
        MERGE (g:Game {id: $gameId})
        MERGE (u)-[r:PLAYED_GAME {difficulty: $difficulty}]->(g)
        ON CREATE SET r.count = CASE WHEN $isWinner THEN 1 ELSE 0 END
        ON MATCH SET r.count = r.count + CASE WHEN $isWinner THEN 1 ELSE 0 END
        RETURN r.count AS winCount
      `, { userId, gameId, difficulty: gameContext.difficulty, isWinner });
      
      const N = Math.max(0, (neo4jResponse?.records?.[0]?.get('winCount')?.toNumber() || 1) - 1);

      if (!isWinner) {
        for (const bet of bets) {
          if (['TOX', 'DHO'].includes(bet.type)) {
            await KomptaLedgerOrchestrator.transfer({
              fromUid: userId, 
              toUid: 'system_canopy_treasury', 
              amount: bet.amount,
              currency: bet.type as any, 
              category: 'CANOPY_TAX_REVENUE',
              referenceUid: `lost_bet_${gameId}_${Date.now()}`,
              description: `Alimentation de la Réserve suite à un pari perdu sur ${gameId}`
            });
          } else if (bet.type === 'TASK' && bet.entityId) {
            await TaskModel.findOneAndUpdate({ uid: bet.entityId }, { $set: { status: 'ARCHIVED_BY_CANOPY', ownerUid: 'system_canopy_treasury' } }, { session: mongoSession });
          }
        }
        return { isWinner, results: [] };
      }

      if (gameContext.mode === 'solo') {
        for (const target of targets) {
          if (['TOX', 'DHO', 'KAOS'].includes(target.type)) {
            await WalletModel.findOneAndUpdate({ userId }, { $inc: { balance: target.amount } }, { session: mongoSession, upsert: true });
          }
        }
        return { isWinner, results: targets };
      }

      const finalResults: IAssetValue[] = [];
      for (const target of targets) {
        if (['TOX', 'DHO'].includes(target.type)) {
          const bank = await BankReserve.findOne({ currency: target.type }).session(mongoSession);
          const I_banque = bank ? bank.wealthIndex : 1.0;
          const M = target.amount;
          const B = DIFFICULTY_MULTIPLIERS[gameContext.difficulty] || 1.0;
          const exponent = -1 * (DECAY_CONSTANT_K / Math.max(0.1, I_banque)) * N;
          const roundedCredit = Math.floor((M + (M * B * Math.exp(exponent))) * 100) / 100;
          await WalletModel.findOneAndUpdate({ userId }, { $inc: { balance: roundedCredit } }, { session: mongoSession, upsert: true });
          finalResults.push({ type: target.type, amount: roundedCredit });
        }
      }
      return { isWinner, results: finalResults };
    });
  }

  // ======================================================================
  // 2. MÉTHODE DE LA BOURSE (Utilisée par la route KonTraKt)
  // ======================================================================
  public static async resolveGameAndCalculateCredit(
    userId: string, 
    gameId: string, 
    gameMode: string,
    difficulty: string,
    wagerCurrency: string,
    wagerAmount: number,
    isWinner: boolean
  ) {
    return await TransactionManager.execute("Calcul de Crédit KonTraKt", async (mongoSession, neo4jTx) => {
      
      const neo4jResponse = await neo4jTx.run(`
        MATCH (u:User {uid: $userId})
        MERGE (g:Game {id: $gameId})
        MERGE (u)-[r:COMPLETED_GAME {difficulty: $difficulty}]->(g)
        ON CREATE SET r.count = CASE WHEN $isWinner THEN 1 ELSE 0 END
        ON MATCH SET r.count = r.count + CASE WHEN $isWinner THEN 1 ELSE 0 END
        RETURN r.count AS winCount
      `, { userId, gameId, difficulty, isWinner });

      const currentWinCount = neo4jResponse?.records?.[0]?.get('winCount')?.toNumber() || 1;
      const N = Math.max(0, currentWinCount - 1); 

      // 🔴 Défaite : Aucun gain
      if (!isWinner) return { creditEarned: 0 };

      // 🟢 Victoire (Mode Solo) : Le joueur récupère sa mise, sans création monétaire
      if (gameMode === 'solo') {
        return { creditEarned: wagerAmount };
      }

      // 🟢 Victoire (Mode Multijoueur) : Équation de décroissance et Indexation
      const bankReserve = await BankReserve.findOne({ currency: wagerCurrency }).session(mongoSession);
      const I_banque = bankReserve ? bankReserve.wealthIndex : 1.0;
      
      const M = wagerAmount;
      const B = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
      const exponent = -1 * (DECAY_CONSTANT_K / Math.max(0.1, I_banque)) * N;
      const totalCredit = M + (M * B * Math.exp(exponent));

      return { creditEarned: Math.floor(totalCredit * 100) / 100 };
    });
  }
}
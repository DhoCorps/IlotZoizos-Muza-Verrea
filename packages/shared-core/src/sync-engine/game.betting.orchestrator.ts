import { TransactionManager } from './transactionManager';
import { TaskModel, WalletModel, BankReserve } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { IlotError } from '../errors/ilot.errors';
import { IAssetValue, GameMode } from '@ilot/types';
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
    gameContext: { mode: GameMode | string; difficulty: 'Initiate' | 'Artisan' | 'Maestro' } = { mode: 'MULTIPLAYER' as GameMode, difficulty: 'Artisan' }
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
          const wallet = await WalletModel.findOne({ userId }).session(mongoSession); // Pas de .lean() ici car on utilise wallet.save()
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

      const normalizedMode = typeof gameContext.mode === 'string' ? gameContext.mode.toUpperCase() : 'MULTIPLAYER';

      if (normalizedMode === 'SOLO' || normalizedMode === 'solo') {
        for (const target of targets) {
          if (['TOX', 'DHO', 'KAOS'].includes(target.type)) {
            await WalletModel.findOneAndUpdate({ userId }, { $inc: { balance: target.amount } }, { session: mongoSession, upsert: true });
          }
        }
        return { isWinner, results: targets };
      }

      const finalResults: IAssetValue[] = [];
      const bankCache = new Map<string, number>(); // 🛡️ Cache mémoire éphémère intra-transaction

      for (const target of targets) {
        if (['TOX', 'DHO'].includes(target.type)) {
          let I_banque: number; // 👈 Déclaration stricte
          
          if (bankCache.has(target.type)) {
            // Le '!' rassure TS : on vient de vérifier que la clé existe
            I_banque = bankCache.get(target.type)!; 
          } else {
            const bank = await BankReserve.findOne({ currency: target.type }).session(mongoSession).lean();
            I_banque = bank ? Number((bank as any).wealthIndex) : 1.0; // Number() garantit le typage
            bankCache.set(target.type, I_banque);
          }

          const M = target.amount;
          const B = DIFFICULTY_MULTIPLIERS[gameContext.difficulty] || 1.0;
          // TypeScript accepte maintenant I_banque sans sourciller !
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
    gameMode: GameMode | string,
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

      const normalizedMode = typeof gameMode === 'string' ? gameMode.toUpperCase() : gameMode;

      // 🟢 Victoire (Mode Solo) : Le joueur récupère sa mise, sans création monétaire
      if (normalizedMode === 'SOLO' || normalizedMode === 'solo') {
        return { creditEarned: wagerAmount };
      }

      // 🟢 Victoire (Mode Multijoueur) : Équation de décroissance et Indexation avec `.lean()`
      const bankReserve = await BankReserve.findOne({ currency: wagerCurrency }).session(mongoSession).lean();
      const I_banque = bankReserve ? Number((bankReserve as any).wealthIndex) : 1.0;
      
      const M = wagerAmount;
      const B = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
      const exponent = -1 * (DECAY_CONSTANT_K / Math.max(0.1, I_banque)) * N;
      const totalCredit = M + (M * B * Math.exp(exponent));

      return { creditEarned: Math.floor(totalCredit * 100) / 100 };
    });
  }
}
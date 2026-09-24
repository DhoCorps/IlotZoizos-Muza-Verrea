import { SubsidyModel } from '@ilot/infrastructure';
import { KomptaLedgerOrchestrator } from './komptaLedger.orchestrator';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { SovereignCurrency } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface FosterSubsidyPayload {
  title: string;
  motivation: string;
  requestedAmount: number;
  currency: SovereignCurrency | string;
  isRented?: boolean;
}

export interface ISubsidyDocument {
  _id?: unknown;
  uid: string;
  requesterUid: string;
  requestedAmount: number;
  currency: SovereignCurrency | string;
  title: string;
  motivation: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  voteCount: number;
  voterUids: string[];
  isRented: boolean;
  updatedAt: Date;
  save(options?: any): Promise<unknown>;
  [key: string]: unknown;
}

export class CanopySubsidyOrchestrator {
  
  /**
   * 🏗️ FONDATION : Déposer un dossier de subvention avec double écriture (Mongo + Neo4j)
   */
  public async fosterSubsidy(payload: FosterSubsidyPayload, signature: ActionSignature): Promise<ISubsidyDocument> {
    return await TransactionManager.execute("Dépôt Subvention Canopée", async (mongoSession, neo4jTx) => {
      const subsidyUid = `sub_${randomUUID()}`;
      const now = new Date();

      const newSubsidyData = {
        uid: subsidyUid,
        requesterUid: signature.actorUid,
        title: payload.title,
        motivation: payload.motivation,
        requestedAmount: payload.requestedAmount,
        currency: payload.currency,
        isRented: payload.isRented || false,
        status: 'PENDING',
        voteCount: 0,
        voterUids: [],
        updatedAt: now
      };

      // 1. Écriture Silice (MongoDB)
      const [newSubsidy] = await SubsidyModel.create([newSubsidyData], { session: mongoSession });

      // 2. Écriture Graphe (Neo4j) - On lie l'Oiseau à sa subvention
      await neo4jTx.run(`
        MATCH (u:User { uid: $actorUid })
        CREATE (s:CanopySubsidy {
            uid: $uid,
            title: $title,
            amount: $amount,
            currency: $currency,
            status: 'PENDING',
            createdAt: datetime($now)
        })
        CREATE (u)-[:REQUESTED_SUBSIDY]->(s)
      `, {
        actorUid: signature.actorUid,
        uid: subsidyUid,
        title: payload.title,
        amount: payload.requestedAmount,
        currency: payload.currency,
        now: now.toISOString()
      });

      return newSubsidy as unknown as ISubsidyDocument;
    });
  }

  /**
   * 🗳️ VOTE : Enregistrer un vote pour une subvention et lier l'Oiseau dans le Graphe
   */
  public async castVote(subsidyUid: string, signature: ActionSignature): Promise<void> {
    await TransactionManager.execute("Vote Subvention Canopée", async (mongoSession, neo4jTx) => {
      const subsidy = (await SubsidyModel.findOne({ uid: subsidyUid }).session(mongoSession)) as unknown as ISubsidyDocument | null;
      
      if (!subsidy) {
        throw new IlotError("Ce dossier de subvention est introuvable.", "NOT_FOUND", 404);
      }

      if (subsidy.voterUids.includes(signature.actorUid)) {
        throw new IlotError("Ta voix résonne déjà pour ce projet.", "CONFLICT", 409);
      }

      const now = new Date();

      // 1. Écriture Silice (MongoDB)
      subsidy.voterUids.push(signature.actorUid);
      subsidy.voteCount += 1;
      subsidy.updatedAt = now;
      await subsidy.save({ session: mongoSession });

      // 2. Écriture Graphe (Neo4j) - Création de l'arête VOTED_FOR
      await neo4jTx.run(`
        MATCH (u:User { uid: $actorUid })
        MATCH (s:CanopySubsidy { uid: $subsidyUid })
        MERGE (u)-[:VOTED_FOR { at: datetime($now) }]->(s)
      `, {
        actorUid: signature.actorUid,
        subsidyUid: subsidy.uid,
        now: now.toISOString()
      });

      return subsidy;
    });
  }

  /**
   * 🎩 TIRAGE : Le "Chapeau de la Canopée" mensuel
   */
  public async executeMonthlyDraw(): Promise<void> {
    const pendingRequests = (await SubsidyModel.find({ status: 'PENDING' })) as unknown as ISubsidyDocument[];
    if (!pendingRequests || pendingRequests.length === 0) return;

    const now = new Date();

    const topTier = pendingRequests.filter(r => r.voteCount > 10);
    const lowTier = pendingRequests.filter(r => r.voteCount <= 10);
    const winner = this.weightedRandomDraw(topTier, lowTier);

    if (winner) {
      await TransactionManager.execute("Tirage Mensuel Canopée", async (mongoSession, neo4jTx) => {
        // 1. Virement via le Ledger avec amountCents 🚀
        await KomptaLedgerOrchestrator.transfer({
          fromUid: 'system_canopy_treasury',
          toUid: winner.requesterUid,
          amountCents: winner.requestedAmount,
          currency: winner.currency as any,
          category: 'SUBSIDY',
          referenceUid: `subsidy_${winner.uid}_${now.getTime()}`,
          description: `Subvention accordée : ${winner.title}`
        });

        // 2. Mise à jour Silice
        winner.status = 'PAID';
        winner.updatedAt = now;
        await winner.save({ session: mongoSession });

        // 3. Mise à jour Graphe
        await neo4jTx.run(`
          MATCH (s:CanopySubsidy { uid: $uid })
          SET s.status = 'PAID', s.updatedAt = datetime($now)
        `, { uid: winner.uid, now: now.toISOString() });
        
        return winner;
      });
    }
  }

  private weightedRandomDraw(top: ISubsidyDocument[], low: ISubsidyDocument[]): ISubsidyDocument | null {
    const pool = [...top, ...top, ...top, ...low];
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
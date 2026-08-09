// packages/shared-core/src/sync-engine/kompta.ledger.service.ts
import crypto from 'crypto';
import { LedgerEntryModel } from '../models/nosql/ledgerEntry.model';

export interface RecordLedgerParams {
  ownerUid: string;
  counterpartyUid: string;
  amountCents: number;
  currency: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'TIP' | 'STORE_SALE' | 'STORE_PURCHASE' | 'BARTER' | 'SYSTEM_TRANSFER';
  referenceUid: string;
  description: string;
  session?: any;
}

export class KomptaLedgerService {
  /**
   * Enregistre une écriture de manière inaltérable dans le grand livre de l'oiseau
   */
  public static async recordEntry(params: RecordLedgerParams): Promise<void> {
    const { ownerUid, counterpartyUid, amountCents, currency, type, category, referenceUid, description, session } = params;

    // 1. Récupérer la dernière écriture de cet oiseau pour lier les hashes (Chaînage)
    const lastEntry = await LedgerEntryModel.findOne({ ownerUid }).sort({ createdAt: -1 }).session(session || null);
    const previousHash = lastEntry ? lastEntry.entryHash : 'ROOT_GENESIS_HASH';

    const entryUid = `ledger_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date();

    // 2. Calculer le hash d'intégrité de l'écriture
    const rawDataToHash = `${entryUid}|${ownerUid}|${counterpartyUid}|${amountCents}|${type}|${category}|${referenceUid}|${previousHash}|${createdAt.getTime()}`;
    const entryHash = crypto.createHash('sha256').update(rawDataToHash).digest('hex');

    // 3. Sauvegarder dans la Silice
    const newEntry = new LedgerEntryModel({
      entryUid,
      ownerUid,
      counterpartyUid,
      amountCents,
      currency,
      type,
      category,
      referenceUid,
      description,
      previousHash,
      entryHash,
      createdAt
    });

    await newEntry.save({ session: session || null });
  }
}
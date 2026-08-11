import crypto from 'crypto';
import { LedgerEntryModel } from '../models/nosql/ledgerEntry.model';

export type SovereignCurrency = 'DHO' | 'TOX' | 'EUR';

export interface RecordLedgerParams {
  ownerUid: string;
  counterpartyUid: string;
  amount: number; // Montant brut dans la monnaie souveraine (DHO ou TOX)
  amountCents?: number; // 👈 AJOUTE CETTE LIGNE ICI (Pour la gestion des paiements fiat/Stripe)
  currency: SovereignCurrency;
  type: 'CREDIT' | 'DEBIT';
  category: 'TIP' | 'STORE_SALE' | 'STORE_PURCHASE' | 'BARTER' | 'SYSTEM_TRANSFER' | 'CANOPY_TAX_REVENUE' | 'BET_WIN' | 'BET_LOSS' |'SUBSIDY' | 'EXTERNAL_DEPOSIT';
  referenceUid: string;
  description: string;
  session?: any;
}

export class KomptaLedgerService {
  /**
   * Enregistre une écriture de manière cryptographiquement inaltérable dans le grand livre souverain
   */
  public static async recordEntry(params: RecordLedgerParams): Promise<void> {
    const { ownerUid, counterpartyUid, amount, currency, type, category, referenceUid, description, session } = params;

    // 1. Récupérer la dernière écriture de cet oiseau pour le chaînage SHA-256
    let query = LedgerEntryModel.findOne({ ownerUid, currency });
    if (query && typeof query.sort === 'function') {
      query = query.sort({ createdAt: -1 });
    }
    if (query && session && typeof query.session === 'function') {
      query = query.session(session);
    }
    
    const lastEntry = typeof query?.lean === 'function' ? await query.lean() : await query;
    const previousHash = lastEntry ? (lastEntry as any).entryHash : `ROOT_GENESIS_${currency}_HASH`;

    const entryUid = `ledger_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date();

    // 2. Calculer le hash d'intégrité inaltérable
    const rawDataToHash = `${entryUid}|${ownerUid}|${counterpartyUid}|${amount}|${currency}|${type}|${category}|${referenceUid}|${previousHash}|${createdAt.getTime()}`;
    const entryHash = crypto.createHash('sha256').update(rawDataToHash).digest('hex');

    // 3. Sauvegarder dans la Silice
    const newEntry = new LedgerEntryModel({
      entryUid,
      ownerUid,
      counterpartyUid,
      amount,
      currency,
      type,
      category,
      referenceUid,
      description,
      previousHash,
      entryHash,
      createdAt
    });

    if (typeof newEntry.save === 'function') {
      await newEntry.save({ session: session || null });
    } else {
      await (LedgerEntryModel as any).create(newEntry.toObject ? newEntry.toObject() : newEntry);
    }
  }

  /**
   * Calcule dynamiquement les soldes d'un oiseau ou de la Banque Centrale par devise
   */
  public static async getUserBalances(ownerUid: string): Promise<Record<string, number>> {
    const entries = await LedgerEntryModel.find({ ownerUid }).lean();
    const balances: Record<string, number> = {};

    for (const entry of entries as any[]) {
      const { currency, type, amount } = entry;
      if (!balances[currency]) balances[currency] = 0;

      if (type === 'CREDIT') {
        balances[currency] += amount;
      } else if (type === 'DEBIT') {
        balances[currency] -= amount;
      }
    }

    return balances;
  }

  /**
   * Compte le nombre d'entrées pour une catégorie spécifique et un propriétaire optionnel
   */
  public static async countEntriesByCategory(category: string, ownerUid?: string): Promise<number> {
    const filter: any = { category };
    if (ownerUid) {
      filter.ownerUid = ownerUid;
    }
    return await LedgerEntryModel.countDocuments(filter);
  }
}
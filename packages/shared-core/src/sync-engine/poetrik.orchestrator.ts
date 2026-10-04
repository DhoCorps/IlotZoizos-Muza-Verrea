// packages/shared-core/src/sync-engine/poetrik.orchestrator.ts
import crypto from 'crypto';
import { LexiconEntryModel, PoemModel, LedgerEntryModel, PoetrikGraph } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

// -------------------------------------------------------------------------
// 🪶 INTERFACES (Payloads)
// -------------------------------------------------------------------------
export interface RhymeItem {
  targetUid: string;
  type: string;
  match: string;
  [key: string]: unknown;
}

export interface TranslationItem {
  targetUid: string;
  lang: string;
  [key: string]: unknown;
}

export interface LexiconEntryPayload {
  uid?: string;
  languageCode: string;
  word: string;
  phoneticIpa: string;
  syllableCount: number;
  definitions: Record<string, string>;
  partOfSpeech: string;
  rhymesWith?: RhymeItem[];
  translations?: TranslationItem[];
  [key: string]: unknown;
}

export interface PoemPayload {
  uid?: string;
  title: string;
  content: string;
  language?: string;
  format?: string;
  inspiredByUid?: string; 
  transferToArena?: boolean; 
  seo?: { metaTitle?: string; metaDescription?: string };
  settings?: { catharsisVeil: boolean };
  audioAmbiance?: { trackUrl?: string; linkedEntityUid?: string };
  cryptoSeal?: { copyrightMetadata?: any };
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  visibility?: 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS_ONLY';
  [key: string]: unknown;
}

export interface PoetrikSyncResult {
  success: boolean;
  status: string;
  mongo?: unknown;
  neo4j?: unknown;
  digitalSignature?: string;
  reward?: { currency: string; amount: number };
  mutations?: string[];
  [key: string]: unknown;
}

// -------------------------------------------------------------------------
// 🌌 L'ORCHESTRATEUR POETRIK
// -------------------------------------------------------------------------
export class PoetrikOrchestrator {
  
  /**
   * 👁️‍🗨️ FONDATION : INGESTION D'UN MOT UNIVERSEL (Oracle Lexical)
   */
  public async fosterLexiconEntry(data: LexiconEntryPayload, signature: ActionSignature): Promise<PoetrikSyncResult> {
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes('SYSTEM_ALL')) {
      throw new IlotError("Aura insuffisante pour forger une entrée lexicale dans l'Oracle.", "FORBIDDEN", 403);
    }

    if (!data.word || !data.phoneticIpa || !data.languageCode) {
      throw new IlotError("Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Fondation Lexicale Poetrik", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      const entryUid = data.uid || `lex_${data.languageCode}_${data.word.toLowerCase()}`;

      const lexiconData = {
        uid: entryUid,
        languageCode: data.languageCode,
        word: data.word,
        phoneticIpa: data.phoneticIpa,
        syllableCount: data.syllableCount || 1,
        definitions: data.definitions || {},
        partOfSpeech: data.partOfSpeech || 'noun',
      };

      // 1. Silice (MongoDB)
      const [savedEntry] = await LexiconEntryModel.create([{ ...lexiconData, createdAt: now, updatedAt: now }], { session: mongoSession });

      // 2. Graphe (Neo4j)
      await PoetrikGraph.upsertWordNode(neo4jTx, {
        uid: entryUid,
        word: data.word,
        languageCode: data.languageCode,
        phoneticIpa: data.phoneticIpa,
        syllableCount: data.syllableCount || 1
      });

      if (data.rhymesWith && data.rhymesWith.length > 0) {
        for (const rhyme of data.rhymesWith) {
          await PoetrikGraph.linkWordsRhyme(neo4jTx, entryUid, rhyme.targetUid, rhyme.type || 'rich', rhyme.match || '');
        }
      }

      return {
        success: true,
        status: 'success',
        mongo: savedEntry
      };
    });
  }

  /**
   * 🪶 SÉDIMENTATION : SCELLER UN POÈME (Le Pacte de Filiation)
   */
  public async sealPoem(data: PoemPayload, signature: ActionSignature): Promise<PoetrikSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("L'identité de l'Oiseau créateur est introuvable.", "UNAUTHORIZED", 401);
    }
    if (!data.title || !data.content) {
      throw new IlotError("Un poème nécessite un titre et des vers.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Sceau Poétique", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      const poemUid = data.uid || `poem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 1. 🛡️ Sceau Cryptographique SHA-256
      const hash = crypto.createHash('sha256');
      hash.update(`${poemUid}-${data.title}-${data.content}-${signature.actorUid}-${now.toISOString()}`);
      const digitalSignature = hash.digest('hex');

      const metaTitle = data.seo?.metaTitle || `Poème : ${data.title}`;
      const metaDescription = data.seo?.metaDescription || data.content.substring(0, 150).replace(/\n/g, ' ') + '...';

      const poemData = {
        uid: poemUid,
        authorUid: signature.actorUid,
        title: data.title,
        content: data.content,
        language: data.language || 'fr',
        format: data.format || 'FREE_VERSE',
        seo: { metaTitle, metaDescription },
        cryptoSeal: {
          digitalSignature,
          timestamp: now,
          copyrightMetadata: data.cryptoSeal?.copyrightMetadata || { role: 'CREATOR', isExclusiveIlot: true, license: 'MIT / Libre Canopée' }
        },
        settings: data.settings || { catharsisVeil: false },
        audioAmbiance: data.audioAmbiance,
        status: data.status || 'PUBLISHED',
        visibility: data.visibility || 'PUBLIC',
      };

      const [savedPoem] = await PoemModel.create([{ ...poemData, createdAt: now, updatedAt: now }], { session: mongoSession });

      await PoetrikGraph.upsertPoemNode(neo4jTx, {
        uid: poemUid,
        title: data.title,
        language: poemData.language,
        format: poemData.format
      });
      await PoetrikGraph.linkAuthorToPoem(neo4jTx, signature.actorUid, poemUid);

      if (data.inspiredByUid) {
        await PoetrikGraph.linkPoemInspiration(neo4jTx, poemUid, data.inspiredByUid);
      }

      // 5. 🍯 Économie : Créditer l'Alvéole en "Parchemins d'Encre"
      let reward = { currency: 'PARCHEMIN', amount: 0 };
      if (poemData.status === 'PUBLISHED') {
        reward.amount = 15; 
        
        if (LedgerEntryModel && LedgerEntryModel.create) {
          const ledgerEntryUid = `ldg_poetrik_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const amountCents = reward.amount * 100; // Conversion en centimes
          
          const entryHash = crypto.createHash('sha256').update(`${ledgerEntryUid}-${signature.actorUid}-${amountCents}`).digest('hex');

          await LedgerEntryModel.create([{
            entryUid: ledgerEntryUid,
            ownerUid: signature.actorUid,
            counterpartyUid: 'SYSTEM_POETRIK',
            amountCents: amountCents,
            currency: reward.currency,
            type: 'CREDIT',
            category: 'REWARD',
            description: 'Publication poétique dans l\'Atelier',
            referenceUid: poemUid,
            entryHash: entryHash,
            createdAt: now
          }], { session: mongoSession });
        }
      }

      const mutations = [];
      if (data.transferToArena) {
        mutations.push('LYRIKA_READY');
        if (poemData.audioAmbiance?.linkedEntityUid) {
          mutations.push('MUSIKA_READY');
        }
      }

      return {
        success: true,
        status: 'sealed',
        digitalSignature,
        reward,
        mutations,
        mongo: savedPoem
      };
    });
  }
}
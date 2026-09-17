import { LexiconEntryModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

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
  uid: string;
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

export interface PoetrikSyncResult {
  success: boolean;
  status: string;
  mongo: unknown;
  neo4j: QueryResult;
  [key: string]: unknown;
}

interface ILexiconEntryDocument {
  uid: string;
  languageCode: string;
  word: string;
  phoneticIpa: string;
  syllableCount: number;
  definitions: Record<string, string>;
  partOfSpeech: string;
  [key: string]: unknown;
}

export class PoetrikOrchestrator {
  /**
   * FONDATION : INGESTION D'UN MOT UNIVERSEL (Lexicon Entry)
   * Enregistre la chair sémantique dans MongoDB et tisse les échos phonétiques et traductions dans Neo4j.
   */
  public async fosterLexiconEntry(data: LexiconEntryPayload, signature: ActionSignature): Promise<PoetrikSyncResult> {
    
    // Seul un Architecte ou le système souverain peut injecter ou enrichir le dictionnaire universel
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes('SYSTEM_ALL')) {
      throw new IlotError("Aura insuffisante pour forger une entrée lexicale dans l'Oracle.", "FORBIDDEN", 403);
    }

    if (!data.word || !data.phoneticIpa || !data.languageCode) {
      throw new IlotError("Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Fondation Lexicale Poetrik", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
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
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [savedEntry] = (await LexiconEntryModel.create([lexiconData], { session: mongoSession })) as unknown as ILexiconEntryDocument[];

      // 2. Tissage dans le Graphe (Neo4j) avec l'horodatage synchronisé
      const cypher = `
        MERGE (w:Word { uid: $uid })
        ON CREATE SET w.createdAt = datetime($now)
        SET w.word = $word,
            w.languageCode = $languageCode,
            w.phoneticIpa = $phoneticIpa,
            w.syllableCount = $syllableCount,
            w.partOfSpeech = $partOfSpeech,
            w.updatedAt = datetime($now)
        RETURN w
      `;

      const neoResult = (await neo4jTx.run(cypher, {
        uid: savedEntry.uid,
        word: savedEntry.word,
        languageCode: savedEntry.languageCode,
        phoneticIpa: savedEntry.phoneticIpa,
        syllableCount: savedEntry.syllableCount,
        partOfSpeech: savedEntry.partOfSpeech,
        now: now.toISOString()
      })) as QueryResult;

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage du mot dans la Matrice Neo4j.", "INTERNAL_ERROR", 500);
      }

      // 3. Tissage optionnel des relations de rimes et traductions (💥 Optimisation UNWIND massive)
      if (data.rhymesWith && data.rhymesWith.length > 0) {
        await neo4jTx.run(`
          MATCH (w1:Word { uid: $sourceUid })
          UNWIND $rhymes AS rhyme
          MATCH (w2:Word { uid: rhyme.targetUid })
          MERGE (w1)-[r:RHYMES_WITH { type: coalesce(rhyme.type, 'rich'), match: coalesce(rhyme.match, '') }]-(w2)
        `, {
          sourceUid: savedEntry.uid,
          rhymes: data.rhymesWith
        });
      }

      if (data.translations && data.translations.length > 0) {
        await neo4jTx.run(`
          MATCH (w1:Word { uid: $sourceUid })
          UNWIND $translations AS trans
          MATCH (w2:Word { uid: trans.targetUid })
          MERGE (w1)-[:TRANSLATES_TO { lang: trans.lang }]-(w2)
        `, {
          sourceUid: savedEntry.uid,
          translations: data.translations
        });
      }

      return {
        success: true,
        status: 'success',
        mongo: savedEntry,
        neo4j: neoResult
      };
    });
  }
}
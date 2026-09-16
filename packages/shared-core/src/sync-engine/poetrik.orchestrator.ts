import { LexiconEntryModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export interface PoetrikSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: import('neo4j-driver').QueryResult;
}

export class PoetrikOrchestrator {
  /**
   * FONDATION : INGESTION D'UN MOT UNIVERSEL (Lexicon Entry)
   * Enregistre la chair sémantique dans MongoDB et tisse les échos phonétiques et traductions dans Neo4j.
   */
  async fosterLexiconEntry(data: {
    uid: string;
    languageCode: string;
    word: string;
    phoneticIpa: string;
    syllableCount: number;
    definitions: Record<string, string>;
    partOfSpeech: string;
    rhymesWith?: Array<{ targetUid: string; type: string; match: string }>;
    translations?: Array<{ targetUid: string; lang: string }>;
  }, signature: ActionSignature): Promise<PoetrikSyncResult> {
    
    // Seul un Architecte ou le système souverain peut injecter ou enrichir le dictionnaire universel
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes('SYSTEM_ALL')) {
      throw new IlotError("Aura insuffisante pour forger une entrée lexicale dans l'Oracle.", "FORBIDDEN", 403);
    }

    if (!data.word || !data.phoneticIpa || !data.languageCode) {
      throw new IlotError("Un mot nécessite au moins un libellé, une phonétique IPA et un code de langue.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Fondation Lexicale Poetrik", async (mongoSession, neo4jTx) => {
      const entryUid = data.uid || `lex_${data.languageCode}_${data.word.toLowerCase()}`;

      const lexiconData = {
        uid: entryUid,
        languageCode: data.languageCode,
        word: data.word,
        phoneticIpa: data.phoneticIpa,
        syllableCount: data.syllableCount || 1,
        definitions: data.definitions || {},
        partOfSpeech: data.partOfSpeech || 'noun'
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [savedEntry] = await LexiconEntryModel.create([lexiconData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j)
      const cypher = `
        MERGE (w:Word { uid: $uid })
        ON CREATE SET w.createdAt = datetime()
        SET w.word = $word,
            w.languageCode = $languageCode,
            w.phoneticIpa = $phoneticIpa,
            w.syllableCount = $syllableCount,
            w.partOfSpeech = $partOfSpeech,
            w.updatedAt = datetime()
        RETURN w
      `;

      const neoResult = await neo4jTx.run(cypher, {
        uid: savedEntry.uid,
        word: savedEntry.word,
        languageCode: savedEntry.languageCode,
        phoneticIpa: savedEntry.phoneticIpa,
        syllableCount: savedEntry.syllableCount,
        partOfSpeech: savedEntry.partOfSpeech
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage du mot dans la Matrice Neo4j.", "INTERNAL_ERROR", 500);
      }

      // 3. Tissage optionnel des relations de rimes et traductions
      if (data.rhymesWith && data.rhymesWith.length > 0) {
        for (const rhyme of data.rhymesWith) {
          await neo4jTx.run(`
            MATCH (w1:Word { uid: $sourceUid })
            MATCH (w2:Word { uid: $targetUid })
            MERGE (w1)-[r:RHYMES_WITH { type: $type, match: $match }]-(w2)
          `, {
            sourceUid: savedEntry.uid,
            targetUid: rhyme.targetUid,
            type: rhyme.type || 'rich',
            match: rhyme.match || ''
          });
        }
      }

      if (data.translations && data.translations.length > 0) {
        for (const trans of data.translations) {
          await neo4jTx.run(`
            MATCH (w1:Word { uid: $sourceUid })
            MATCH (w2:Word { uid: $targetUid })
            MERGE (w1)-[:TRANSLATES_TO { lang: $lang }]-(w2)
          `, {
            sourceUid: savedEntry.uid,
            targetUid: trans.targetUid,
            lang: trans.lang
          });
        }
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
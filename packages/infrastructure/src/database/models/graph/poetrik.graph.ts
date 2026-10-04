// packages/infrastructure/src/database/neo4j/poetrik.graph.ts
import { Transaction } from 'neo4j-driver';

export class PoetrikGraph {
  
  // ==========================================
  // 🪶 PARTIE 1 : LES POÈMES ET LES MUSES
  // ==========================================

  /**
   * Création ou mise à jour d'un Nœud Poème dans le Graphe
   */
  static async upsertPoemNode(tx: Transaction, poemData: { uid: string; title: string; language: string; format: string }) {
    const cypher = `
      MERGE (p:Poem { uid: $uid })
      SET p.title = $title,
          p.language = $language,
          p.format = $format,
          p.updatedAt = datetime()
      RETURN p
    `;
    return tx.run(cypher, poemData);
  }

  /**
   * Lien de Paternité : Relie l'Oiseau Créateur à son Poème
   */
  static async linkAuthorToPoem(tx: Transaction, authorUid: string, poemUid: string) {
    const cypher = `
      MATCH (u:User { uid: $authorUid })
      MATCH (p:Poem { uid: $poemUid })
      MERGE (u)-[r:AUTHORED]->(p)
      SET r.timestamp = datetime()
      RETURN r
    `;
    return tx.run(cypher, { authorUid, poemUid });
  }

  /**
   * Le Tissage des Muses : Relie un Poème dérivé à son Poème source
   */
  static async linkPoemInspiration(tx: Transaction, sourcePoemUid: string, targetPoemUid: string) {
    const cypher = `
      MATCH (p1:Poem { uid: $sourcePoemUid })
      MATCH (p2:Poem { uid: $targetPoemUid })
      MERGE (p1)-[r:INSPIRED_BY]->(p2)
      SET r.timestamp = datetime()
      RETURN r
    `;
    return tx.run(cypher, { sourcePoemUid, targetPoemUid });
  }

  // ==========================================
  // 👁️‍🗨️ PARTIE 2 : L'ORACLE LEXICAL (MOTS & RIMES)
  // ==========================================

  /**
   * Création ou mise à jour d'un Nœud Mot (Lexique)
   */
  static async upsertWordNode(tx: Transaction, wordData: { uid: string; word: string; languageCode: string; phoneticIpa: string; syllableCount: number }) {
    const cypher = `
      MERGE (w:Word { uid: $uid })
      SET w.word = $word,
          w.languageCode = $languageCode,
          w.phoneticIpa = $phoneticIpa,
          w.syllableCount = $syllableCount,
          w.updatedAt = datetime()
      RETURN w
    `;
    return tx.run(cypher, wordData);
  }

  /**
   * Pont Phonétique : Crée une relation de Rime entre deux Mots
   */
  static async linkWordsRhyme(tx: Transaction, sourceWordUid: string, targetWordUid: string, type: string, match: string) {
    const cypher = `
      MATCH (w1:Word { uid: $sourceWordUid })
      MATCH (w2:Word { uid: $targetWordUid })
      MERGE (w1)-[r:RHYMES_WITH { type: $type }]->(w2)
      SET r.matchScore = $match,
          r.updatedAt = datetime()
      RETURN r
    `;
    return tx.run(cypher, { sourceWordUid, targetWordUid, type, match });
  }
}
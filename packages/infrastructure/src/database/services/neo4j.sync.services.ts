// packages/infrastructure/src/database/services/neo4j.sync.ts
import { getNeo4jDriver } from '../neo4j'; // ou ton driver habituel

export type UniversalInteractionContext = 
  | 'CHAT' 
  | 'ECOMMERCE' 
  | 'KONTAKT' 
  | 'TASK' 
  | 'PRAISE' 
  | 'TEAM'
  | 'BIBLIOTEK'
  | 'PARTITA'
  | 'SAMPLOTEK'
  | 'SUJET'
  | 'POETRIK'
  | 'UNIVERSHALL'
  | 'LETRIN'
  | 'ABYSS'
  | string; // Permet de rester ouvert aux extensions futures tout en gardant l'autocomplétion sur les connus

/**
 * 🕸️ SYNCHRONISATION UNIVERSELLE DU GRAPHE
 * Enregistre ou renforce le lien d'interaction neutre entre deux oiseaux
 * pour alimenter l'algorithme d'impartialité du Tribunal de la Canopée.
 */
export async function syncUniversalInteraction(
  uidA: string, 
  uidB: string, 
  contextModule: UniversalInteractionContext
): Promise<void> {
  if (!uidA || !uidB || uidA === uidB) return;

  const session = getNeo4jDriver().session();
  try {
    const cypher = `
      MATCH (a:User {uid: $uidA})
      MATCH (b:User {uid: $uidB})
      MERGE (a)-[r:INTERACTS_WITH]-(b)
      ON CREATE SET 
        r.weight = 1, 
        r.firstInteraction = datetime(), 
        r.lastInteraction = datetime(), 
        r.contexts = [$contextModule]
      ON MATCH SET 
        r.weight = r.weight + 1, 
        r.lastInteraction = datetime(), 
        r.contexts = CASE 
          WHEN NOT $contextModule IN r.contexts 
          THEN r.contexts + $contextModule 
          ELSE r.contexts 
        END
    `;
    await session.run(cypher, { uidA, uidB, contextModule });
  } catch (error) {
    console.error(`⚠️ [Neo4j Sync] Échec du tissage d'interaction entre ${uidA} et ${uidB}:`, error);
    // On ne bloque pas le flux métier si le graphe tousse (grâce au TransactionManager ou try/catch silencieux)
  } finally {
    await session.close();
  }
}
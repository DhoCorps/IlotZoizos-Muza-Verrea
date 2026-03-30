import neo4j, { Driver, Session, QueryResult, RecordShape } from 'neo4j-driver';

// Singleton pour éviter de recréer le driver à chaque appel
let cachedDriver: Driver | null = null;

/**
 * 🚆 Initialise ou récupère le Driver Neo4j
 */
export const getNeo4jDriver = (): Driver => {
  if (cachedDriver) return cachedDriver;

  // 🎯 FORÇAGE DES VALEURS (Priorité au .env, sinon fallback local)
  const uri = process.env.NEO4J_URI || 'bolt://127.0.0.1:7687';
  const user = process.env.NEO4J_USERNAME || 'neo4j'; 
  const password = process.env.NEO4J_PASSWORD || 'password777'; 

  try {
    // Utilisation de bolt:// pour une connexion plus directe et stable
    cachedDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    console.log(`🕸️  [Neo4j] Gare Centrale connectée sur ${uri} (User: ${user})`);
    return cachedDriver;
  } catch (error) {
    console.error('❌ [Neo4j] Échec critique de la connexion au tunnel :', error);
    throw error;
  }
};

/**
 * 🗝️ Ouvre et retourne une nouvelle session Neo4j standard
 */
export const getNeo4jSession = (): Session => {
  return getNeo4jDriver().session();
};

/**
 * 🚀 runQuery : Exécute Cypher et GARANTIT la fermeture de la session.
 * Typage générique <T> pour retourner directement le format attendu.
 */
export async function runQuery<T extends RecordShape = any>(cypher: string, params: Record<string, any> = {}): Promise<QueryResult<T>> {
  const session = getNeo4jSession();
  
  try {
    const result = await session.run(cypher, params);
    // On retourne le QueryResult complet (qui contient les .records)
    return result as unknown as QueryResult<T>;
  } catch (error: any) {
    console.error("❌ [Neo4j] Erreur d'exécution de la requête :", error.message);
    throw error;
  } finally {
    // ⚡ LIBÉRATION DU PORT 7687 : Vital pour éviter les fuites de mémoire
    await session.close();
  }
}

/**
 * ✍️ ÉCRITURE : Utilise les transactions explicites (recommandé par Neo4j pour les mutations)
 */
export const writeToGraph = async (cypher: string, params: Record<string, any> = {}) => {
  const session = getNeo4jSession();
  try {
    const result = await session.executeWrite(tx => tx.run(cypher, params));
    return result;
  } catch (error: any) {
    console.error("❌ [NEO4J WRITE ERROR] :", error.message);
    throw error;
  } finally {
    // 🛡️ Crucial pour garder le dashboard 100% vert
    await session.close(); 
  }
};

/**
 * 🔍 LECTURE SEULE : Optimisé pour chercher des oiseaux ou des fragments
 */
export const readFromGraph = async (cypher: string, params: Record<string, any> = {}) => {
  // Session spécifique en mode READ pour des performances accrues
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject());
  } catch (error: any) {
    console.error("❌ [NEO4J READ ERROR] :", error.message);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * 🧹 Fermeture propre du driver (à appeler lors de l'arrêt du serveur)
 */
export const closeNeo4j = async () => {
  if (cachedDriver) {
    await cachedDriver.close();
    cachedDriver = null;
    console.log("🔌 [Neo4j] Connexions fermées proprement.");
  }
};

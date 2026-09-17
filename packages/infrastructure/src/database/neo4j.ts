import neo4j, { Driver, Session, QueryResult, RecordShape } from 'neo4j-driver';

// 🪡 SUTURE ANTI-FANTÔME : Liaison au scope global pour préserver le cache face au Hot Reload de Next.js
const globalForNeo4j = globalThis as unknown as {
  cachedDriver: Driver | null;
};

/**
 * 🚆 Initialise ou récupère le Driver Neo4j
 */
export const getNeo4jDriver = (): Driver => {
  if (globalForNeo4j.cachedDriver) return globalForNeo4j.cachedDriver;

  // 🎯 FORÇAGE DES VALEURS (Priorité au .env, sinon fallback local)
  const uri = process.env.NEO4J_URI || 'bolt://127.0.0.1:7687';
  const user = process.env.NEO4J_USERNAME || 'neo4j'; 
  const password = process.env.NEO4J_PASSWORD || 'password777'; 

  try {
    // Utilisation de bolt:// pour une connexion plus directe et stable
    globalForNeo4j.cachedDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    console.log(`🕸️  [Neo4j] Gare Centrale connectée sur ${uri} (User: ${user})`);
    return globalForNeo4j.cachedDriver;
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
 * 🛡️ withNeo4jSession : Encapsule l'exécution d'une opération au sein d'une session Neo4j 
 * et GARANTIT sa fermeture absolue (anti-fuites mémoire / pool de connexions saturé).
 */
export async function withNeo4jSession<T>(
  operation: (session: Session) => Promise<T>
): Promise<T> {
  const session = getNeo4jSession();
  try {
    return await operation(session);
  } catch (error: any) {
    console.error("❌ [Neo4j] Erreur dans le wrapper de session :", error.message);
    throw error;
  } finally {
    // ⚡ LIBÉRATION DU PORT 7687 : Vital pour éviter les fuites de connexions
    await session.close();
  }
}

/**
 * 🚀 runQuery : Exécute Cypher et GARANTIT la fermeture de la session.
 * Typage générique <T> pour retourner directement le format attendu.
 */
export async function runQuery<T extends RecordShape = any>(cypher: string, params: Record<string, any> = {}): Promise<QueryResult<T>> {
  return withNeo4jSession(async (session) => {
    const result = await session.run(cypher, params);
    return result as unknown as QueryResult<T>;
  });
}

/**
 * ✍️ ÉCRITURE : Utilise les transactions explicites (recommandé par Neo4j pour les mutations)
 */
export const writeToGraph = async (cypher: string, params: Record<string, any> = {}) => {
  return withNeo4jSession(async (session) => {
    const result = await session.executeWrite(tx => tx.run(cypher, params));
    return result;
  });
};

/**
 * 🔍 LECTURE SEULE : Optimisé pour chercher des oiseaux ou des fragments
 */
export const readFromGraph = async (cypher: string, params: Record<string, any> = {}) => {
  // Session spécifique en mode READ pour des performances accrues
  const driver = getNeo4jDriver();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
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
  if (globalForNeo4j.cachedDriver) {
    await globalForNeo4j.cachedDriver.close();
    globalForNeo4j.cachedDriver = null;
    console.log("🔌 [Neo4j] Connexions fermées proprement.");
  }
};
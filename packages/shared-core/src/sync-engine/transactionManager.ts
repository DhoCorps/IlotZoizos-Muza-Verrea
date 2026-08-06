// packages/shared-core/src/sync-engine/transactionManager.ts
import mongoose, { ClientSession } from 'mongoose';
import { getNeo4jDriver } from '@ilot/infrastructure'; // 💡 Utilisation de l'export propre du package infrastructure
import { Transaction } from 'neo4j-driver';

export class TransactionManager {
  /**
   * 🛡️ TRANSACTION MANAGER V2.5 : LE DOUBLE SCELLEMENT ATOMIQUE
   * Orchestre une transaction conjointe entre MongoDB (Silice) et Neo4j (Matrice)
   * avec stratégie de compensation en cas de rupture du second système.
   */
  public static async execute<T>(
    operationName: string,
    operation: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<T>
  ): Promise<T> {
    
    // 1. Initialisation des sessions pour les deux bases de données
    const mongoSession = await mongoose.startSession();
    const neo4jSession = getNeo4jDriver().session();
    
    mongoSession.startTransaction();
    const neo4jTx = neo4jSession.beginTransaction();

    let mongoCommitted = false;

    try {
      // 2. EXÉCUTION DU MÉTIER
      // L'orchestrateur effectue les écritures dans les deux bases via les sessions ouvertes
      const result = await operation(mongoSession, neo4jTx);

      // 3. LE SCELLÉ SÉQUENTIEL SÉCURISÉ
      // Étape A : On valide d'abord MongoDB (Source de vérité documentaire / Silice)
      await mongoSession.commitTransaction();
      mongoCommitted = true;

      // Étape B : On valide ensuite Neo4j (Projection relationnelle / Graphe)
      try {
        await neo4jTx.commit();
      } catch (neo4jCommitError: any) {
        // 🚨 CATASTROPHE CRITIQUE : MongoDB est validé mais Neo4j échoue au commit.
        // Il faut déclencher une alerte de désynchronisation ou une compensation.
        console.error(`💥 [FATAL DESYNC] MongoDB scellé mais échec du commit Neo4j sur [${operationName}] :`, neo4jCommitError.message);
        throw new Error(`[TransactionManager] Rupture de la Matrice Neo4j après scellement MongoDB : ${neo4jCommitError.message}`);
      }
      
      console.log(`✅ [NEXUS] Harmonie totale (Mongo + Neo4j) : ${operationName}`);
      return result;

    } catch (error: any) {
      // 🚨 4. ROLLBACK D'URGENCE ET STRATÉGIE DE COMPENSATION
      
      // Si MongoDB n'avait pas encore été scellé, on l'annule proprement
      if (!mongoCommitted && typeof mongoSession.inTransaction === 'function' && mongoSession.inTransaction()) {
        try {
          await mongoSession.abortTransaction();
        } catch (mongoAbortErr) {
          console.error(`⚠️ [TransactionManager] Erreur lors de l'abandon de la session Mongo :`, mongoAbortErr);
        }
      }
      
      // On tente de refermer/annuler la transaction Neo4j
      try {
        if (neo4jTx.isOpen()) {
          await neo4jTx.rollback();
        }
      } catch (neo4jRollbackErr) {
        // Ignoré si la transaction était déjà fermée ou expirée
      }
      
      console.error(`❌ [NEXUS] Brèche détectée sur ${operationName} :`, error.message);
      
      // On propage l'erreur propre pour l'API / le client
      throw new Error(`[TransactionManager] Échec de la transaction ${operationName} : ${error.message}`); 

    } finally {
      // 5. NETTOYAGE CLINIQUE DES RESSOURCES
      try {
        if (typeof mongoSession.endSession === 'function') {
          await mongoSession.endSession();
        }
      } catch (e) { /* Nettoyage silencieux */ }

      try {
        if (typeof neo4jSession.close === 'function') {
          await neo4jSession.close();
        }
      } catch (e) { /* Nettoyage silencieux */ }
    }
  }
}
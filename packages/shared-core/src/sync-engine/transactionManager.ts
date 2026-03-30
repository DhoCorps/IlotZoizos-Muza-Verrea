import mongoose, { ClientSession } from 'mongoose';
import { getNeo4jDriver } from '@ilot/infrastructure';
import { Transaction } from 'neo4j-driver'; // 🌟 Typage précis

export const TransactionManager = {
  /**
   * 🛡️ TRANSACTION MANAGER V2 : LE SQUELETTE D'ACIER
   */
  async execute<T>(
    operationName: string,
    operation: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<T>
  ): Promise<T> {
    
    // 1. Initialisation des canaux
    const mongoSession = await mongoose.startSession();
    const neo4jSession = getNeo4jDriver().session();
    
    // On démarre la transaction Mongo
    mongoSession.startTransaction();
    // On ouvre le canal transactionnel Neo4j
    const neo4jTx = neo4jSession.beginTransaction();

    try {
      // 2. EXÉCUTION DU MÉTIER
      // On passe les deux outils à l'orchestrateur
      const result = await operation(mongoSession, neo4jTx);

      // 3. LE SCELLÉ (L'ORDRE COMPTE)
      // On commit Neo4j en premier car il est souvent plus sensible aux timeouts
      await neo4jTx.commit();
      // Si Neo4j a réussi, on scelle Mongo
      await mongoSession.commitTransaction();
      
      console.log(`✅ [NEXUS] Harmonie totale : ${operationName}`);
      return result;

    } catch (error: any) {
      // 🚨 4. ROLLBACK D'URGENCE
      // On tente d'annuler les deux, peu importe lequel a déclenché l'erreur
      if (mongoSession.inTransaction()) {
        await mongoSession.abortTransaction();
      }
      
      // Neo4j rollback (le driver gère si la transaction est déjà fermée)
      try {
        await neo4jTx.rollback();
      } catch (neo4jError) {
        // On ignore si le rollback neo4j échoue (souvent car la session est déjà morte)
      }
      
      console.error(`❌ [NEXUS] Brèche sur ${operationName} :`, error.message);
      
      // On relance une erreur enrichie pour que l'orchestrateur sache quoi faire
      throw new Error(`[TransactionManager] Échec de ${operationName} : ${error.message}`); 

    } finally {
      // 5. NETTOYAGE CLINIQUE
      await mongoSession.endSession();
      await neo4jSession.close();
    }
  }
};
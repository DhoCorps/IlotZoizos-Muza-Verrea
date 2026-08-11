import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { getNeo4jDriver } from '@ilot/infrastructure'; 
import { Transaction } from 'neo4j-driver';

export class TransactionManager {
  /**
   * 🛡️ TRANSACTION MANAGER V3.0 : LE TRIPLE SCELLÉ (AVEC DEAD LETTER QUEUE)
   * Orchestre une transaction conjointe entre MongoDB (Silice) et Neo4j (Matrice).
   * Intègre une file d'attente de rattrapage (DLQ) pour garantir l'intégrité finale
   * en cas de fracture isolée du graphe.
   */
  public static async execute<T>(
    operationName: string,
    operation: (mongoSession: ClientSession, neo4jTx: Transaction) => Promise<T>
  ): Promise<T> {
    
    // 1. Initialisation des connexions aux deux mondes
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
        // 🚨 CATASTROPHE CRITIQUE MAIS CONTRÔLÉE : Sauvetage en Dead Letter Queue
        console.error(`💥 [FATAL DESYNC] Échec du commit Neo4j sur [${operationName}] :`, neo4jCommitError.message);
        
        try {
          // On consigne la rupture dans la Silice pour un rejeu futur (Cron de synchronisation)
          await mongoose.connection.collection('system_graph_dlq').insertOne({
            operationName,
            errorPayload: neo4jCommitError.message,
            status: 'PENDING_RETRY',
            timestamp: new Date()
          });
          console.warn(`🚑 [DLQ] Désynchronisation consignée avec succès. La Matrice sera réparée ultérieurement.`);
        } catch (dlqError) {
          console.error(`🌑 [ABYSS] Échec total de la DLQ ! La désynchronisation n'a pas pu être sauvegardée.`, dlqError);
        }

        throw new Error(`[TransactionManager] Rupture de la Matrice Neo4j (Consignée en DLQ) : ${neo4jCommitError.message}`);
      }
      
      console.log(`✅ [NEXUS] Harmonie totale (Mongo + Neo4j) : ${operationName}`);
      return result;

    } catch (error: any) {
      // 🚨 4. ROLLBACK D'URGENCE
      
      // Si MongoDB n'avait pas encore été scellé, on l'annule proprement
      if (!mongoCommitted && mongoSession.inTransaction()) {
        try {
          await mongoSession.abortTransaction();
        } catch (mongoAbortErr) {
          console.error(`⚠️ [TransactionManager] Échec de l'abandon de la session Mongo :`, mongoAbortErr);
        }
      }
      
      // On tente de refermer/annuler la transaction Neo4j
      if (neo4jTx.isOpen()) {
        try {
          await neo4jTx.rollback();
        } catch (neo4jRollbackErr) {
          // Ignoré silencieusement, la transaction est probablement déjà expirée
        }
      }
      
      console.error(`❌ [NEXUS] Brèche détectée sur ${operationName} :`, error.message);
      
      // On propage l'erreur propre pour l'API / le client
      throw new Error(`[TransactionManager] Échec de la transaction ${operationName} : ${error.message}`); 

    } finally {
      // 5. NETTOYAGE CLINIQUE ET INFAILLIBLE DES RESSOURCES
      if (mongoSession) {
        try { 
            await mongoSession.endSession(); 
        } catch (e) { /* Silencieux */ }
      }

      if (neo4jSession) {
        try { 
            await neo4jSession.close(); 
        } catch (e) { /* Silencieux */ }
      }
    }
  }
}
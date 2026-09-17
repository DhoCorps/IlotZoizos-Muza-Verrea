import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { getNeo4jDriver } from '@ilot/infrastructure'; 
import { Transaction } from 'neo4j-driver';
import { IlotError } from '../errors/ilot.errors'; // 👈 Ajout de l'import

export class TransactionManager {
  /**
   * 🛡️ TRANSACTION MANAGER V3.1 : LE TRIPLE SCELLÉ (AVEC DEAD LETTER QUEUE)
   * Orchestre une transaction conjointe entre MongoDB (Silice) et Neo4j (Matrice).
   * Intègre une file d'attente de rattrapage (DLQ) pour garantir l'intégrité finale
   * en cas de fracture isolée du graphe, et préserve les codes d'erreurs métiers.
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
      } catch (neo4jCommitError: unknown) {
        const neo4jErrorMessage = neo4jCommitError instanceof Error ? neo4jCommitError.message : String(neo4jCommitError);
        // 🚨 CATASTROPHE CRITIQUE MAIS CONTRÔLÉE : Sauvetage en Dead Letter Queue
        console.error(`💥 [FATAL DESYNC] Échec du commit Neo4j sur [${operationName}] :`, neo4jErrorMessage);
        
        try {
          // On consigne la rupture dans la Silice pour un rejeu futur (Cron de synchronisation)
          await mongoose.connection.collection('system_graph_dlq').insertOne({
            operationName,
            errorPayload: neo4jErrorMessage,
            status: 'PENDING_RETRY',
            timestamp: new Date()
          });
          console.warn(`🚑 [DLQ] Désynchronisation consignée avec succès. La Matrice sera réparée ultérieurement.`);
        } catch (dlqError: unknown) {
          const dlqErrorMessage = dlqError instanceof Error ? dlqError.message : String(dlqError);
          console.error(`🌑 [ABYSS] Échec total de la DLQ ! La désynchronisation n'a pas pu être sauvegardée.`, dlqErrorMessage);
        }

        throw new IlotError(`Rupture de la Matrice Neo4j (Consignée en DLQ) : ${neo4jErrorMessage}`, "INTERNAL_ERROR", 500);
      }
      
      console.log(`✅ [NEXUS] Harmonie totale (Mongo + Neo4j) : ${operationName}`);
      return result;

    } catch (error: unknown) {
      // 🚨 4. ROLLBACK D'URGENCE
      
      // Si MongoDB n'avait pas encore été scellé, on l'annule proprement
      if (!mongoCommitted && mongoSession.inTransaction()) {
        try {
          await mongoSession.abortTransaction();
        } catch (mongoAbortErr: unknown) {
          const abortMsg = mongoAbortErr instanceof Error ? mongoAbortErr.message : String(mongoAbortErr);
          console.error(`⚠️ [TransactionManager] Échec de l'abandon de la session Mongo :`, abortMsg);
        }
      }
      
      // On tente de refermer/annuler la transaction Neo4j
      if (neo4jTx.isOpen()) {
        try {
          await neo4jTx.rollback();
        } catch {
          // Ignoré silencieusement, la transaction est probablement déjà expirée
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ [NEXUS] Brèche détectée sur ${operationName} :`, errorMessage);
      
      // 🛡️ CORRECTION CRITIQUE : Préserver les erreurs métiers (IlotError)
      // Si l'erreur provient de nos vérifications métier (403, 404, etc.), on la propage intacte.
      if (error instanceof IlotError || (typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'IlotError')) {
        throw error;
      }

      // Sinon, on encapsule les erreurs systèmes non gérées
      throw new IlotError(`Échec inattendu de la transaction [${operationName}] : ${errorMessage}`, "INTERNAL_ERROR", 500);

    } finally {
      // 5. NETTOYAGE CLINIQUE ET INFAILLIBLE DES RESSOURCES
      if (mongoSession) {
        try { 
            await mongoSession.endSession(); 
        } catch { /* Silencieux */ }
      }

      if (neo4jSession) {
        try { 
            await neo4jSession.close(); 
        } catch { /* Silencieux */ }
      }
    }
  }
}
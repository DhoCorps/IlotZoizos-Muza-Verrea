import { baguerOiseau } from '@ilot/infrastructure'; 

export interface SyncResult {
  source: 'mongodb' | 'neo4j';
  status: 'success' | 'failed';
  timestamp: number;
}

export class SyncOrchestrator {
  /**
   * Synchronise un nouvel utilisateur entre Mongo et Neo4j
   * On bague l'oiseau avec son UID technique unique
   */
  static async syncUserCreation(userData: { 
    uid: string; 
    username: string; 
    role: string 
  }) {
    console.log(`✨ [Orchestrator] Début du baguage pour l'oiseau : ${userData.username}`);
    
    try {
      // On transmet le UID à la fonction d'infrastructure
      const node = await baguerOiseau({
        uid: userData.uid,
        username: userData.username,
        role: userData.role
      });
      
      console.log(`✅ [Orchestrator] Baguage réussi dans Neo4j pour l'UID: ${userData.uid}`);

      return { 
        status: 'success' as const, 
        source: 'neo4j' as const, 
        timestamp: Date.now(),
        data: node 
      };
    } catch (error) {
      console.error(`🔥 [Sync Error] Échec du baguage Neo4j pour ${userData.username}:`, error);
      throw error;
    }
  }
}
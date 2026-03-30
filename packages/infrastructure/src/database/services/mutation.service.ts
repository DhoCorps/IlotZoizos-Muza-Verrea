import { 
  syncUserToGraph, 
  deleteBird, 
  updateProjectSync 
} from './sync.service'; // Assure-toi que le nom du fichier est correct
import { IUser, IProject } from '@ilot/types';
import { getNeo4jDriver } from '@ilot/infrastructure'; // 👈 AJUSTE CE CHEMIN : Il doit pointer vers ton fichier qui exporte getNeo4jDriver

/**
 * 🌀 MUTATION SERVICE (MutationTrigger)
 * Centralise les effets de bord après une modification en base NoSQL.
 */
export const MutationTrigger = {
  
  /**
   * Synchronise un utilisateur (création ou mise à jour profil)
   */
  handleUserSync: async (user: IUser) => {
    try {
      await syncUserToGraph(user);
      console.log(`✅ [Mutation] Sync utilisateur réussie: ${user.username}`);
    } catch (error) {
      console.error(`❌ [Mutation] Échec sync utilisateur:`, error);
    }
  },

  /**
   * Synchronise la mise à jour d'un projet
   */
  handleProjectUpdate: async (uid: string, data: Partial<IProject>) => {
    try {
      await updateProjectSync(uid, data);
      console.log(`✅ [Mutation] Sync projet réussie: ${uid}`);
    } catch (error) {
      console.error(`❌ [Mutation] Échec sync projet:`, error);
    }
  },

  /**
   * Gère la suppression d'un oiseau du ciel de l'Îlot
   */
  handleUserDeletion: async (userUid: string) => {
    try {
      await deleteBird(userUid);
      console.log(`✅ [Mutation] Suppression graphe réussie: ${userUid}`);
    } catch (error) {
      console.error(`❌ [Mutation] Échec suppression graphe:`, error);
    }
  }
};

/**
 * 🔥 BURN FRAGMENT
 * Détruit définitivement un Chantier (Projet) et toutes ses relations dans le graphe Neo4j.
 */
export const burnFragmentFromGraph = async (projectUid: string): Promise<void> => {
  // 1. On initialise le driver et la session
  const driver = getNeo4jDriver(); 
  const session = driver.session();
  
  try {
    // 2. Le DETACH DELETE est vital : il coupe les liens (assignations, parenté) avant de détruire le nœud
    await session.run(
      'MATCH (p:Project {uid: $projectUid}) DETACH DELETE p',
      { projectUid }
    );
    console.log(`🔥 [Graph] Fragment incinéré avec succès : ${projectUid}`);
  } catch (error) {
    console.error(`🚨 [Graph] Erreur lors de l'incinération du fragment :`, error);
    throw error; // On relance l'erreur pour que la route API le sache
  } finally {
    // 🔒 3. On sécurise la connexion pour éviter la fuite de mémoire (Correctif Neo4j appliqué !)
    await session.close();
  }
};

// Export par défaut si ton import ne précise pas d'accolades
export default MutationTrigger;
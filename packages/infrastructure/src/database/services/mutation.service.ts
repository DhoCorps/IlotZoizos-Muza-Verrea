import { 
  syncUserToGraph, 
  deleteBird 
} from './sync.service'; // Assure-toi que le nom du fichier est correct
import { IUser } from '@ilot/types';

/**
 * 🌀 MUTATION SERVICE (MutationTrigger)
 * Centralise les effets de bord après une modification en base NoSQL concernant les identités.
 */
export const MutationTrigger = {
  
  /**
   * Synchronise un utilisateur (création, mise à jour profil, rôles, permissions)
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
   * Gère la suppression d'un oiseau du ciel de l'Îlot (et de ses permissions/rôles associés)
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

// Export par défaut
export default MutationTrigger;
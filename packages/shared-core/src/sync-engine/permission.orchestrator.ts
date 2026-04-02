import { PermissionModel } from '@ilot/infrastructure';
import { CAPABILITIES } from '@ilot/types';

/**
 * 🗝️ PERMISSION ORCHESTRATOR
 * Gère le référentiel des capacités atomiques de l'Îlot.
 */
export const PermissionOrchestrator = {
  
  // 🌱 SEEDING : Initialise toutes les permissions définies dans CAPABILITIES
  async syncCapabilities() {
    const allPermissions = Object.values(CAPABILITIES).flatMap(group => 
      Object.entries(group)
    );

    const operations = allPermissions.map(([key, code]) => ({
      updateOne: {
        filter: { code },
        update: { 
          $set: { 
            intitule: key.replace(/_/g, ' '), 
            description: `Droit d'exécuter l'action : ${code}` 
          } 
        },
        upsert: true
      }
    }));

    return await PermissionModel.bulkWrite(operations);
  },

  // 📖 READ : Récupérer le grimoire des pouvoirs
  async getAll() {
    return await PermissionModel.find({}).sort({ code: 1 }).lean();
  },

  // 🛠️ CRUD de base pour les ajustements manuels
  async create(data: { intitule: string, code: string, description?: string }) {
    return await PermissionModel.create(data);
  },

  async delete(uid: string) {
    return await PermissionModel.findOneAndDelete({ uid });
  }
};
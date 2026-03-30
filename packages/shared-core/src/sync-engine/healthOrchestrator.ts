import { ProjectModel, TeamModel } from '@ilot/infrastructure';
import { Types } from 'mongoose';
import { TransactionManager } from './transactionManager';

export const HealthOrchestrator = {
  /**
   * 📉 Synchronise la santé collective d'un nid basée sur ses fragments actifs.
   */
  async syncTeamHealth(teamId: Types.ObjectId | string) {
    const teamObjectId = typeof teamId === 'string' ? new Types.ObjectId(teamId) : teamId;

    return await TransactionManager.execute("Synchronisation Biométrique", async (mongoSession, neo4jTx) => {
      // 1. Agrégation (Pas besoin de session pour la lecture)
      const stats = await ProjectModel.aggregate([
        { 
          $match: { 
            teamId: teamObjectId.toString(),
            isArchived: false 
          } 
        },
        { 
          $group: {
            _id: "$teamId",
            averageStress: { $avg: "$wellbeing.globalStressLevel" },
            projectCount: { $sum: 1 }
          }
        }
      ]);

      const result = stats[0] || { averageStress: 0, projectCount: 0 };
      const load = Math.round(result.averageStress);
      
      // 🛡️ SÉCURITÉ : Vitesse Réduite globale si charge > 90%
      let isGlobalReducedSpeed = false;
      if (load > 90) {
        isGlobalReducedSpeed = true;
        await ProjectModel.updateMany(
          { teamId: teamObjectId.toString(), isArchived: false },
          { 
            $set: { 
              "wellbeing.isAtReducedSpeed": true,
              status: 'REDUCED_SPEED'
            } 
          },
          { session: mongoSession }
        );
      }

      const isOverloaded = load > 75 || result.projectCount > 10;

      // 2. Mise à jour de MongoDB
      const updatedTeam = await TeamModel.findByIdAndUpdate(
        teamObjectId,
        { 
          $set: { 
            "collectiveHealth.averageMentalLoad": load,
            "collectiveHealth.isOverloaded": isOverloaded,
            "settings.isGlobalReducedSpeed": isGlobalReducedSpeed
          } 
        },
        { new: true, session: mongoSession }
      );

      if (!updatedTeam) return;

      // 3. Synchronisation Neo4j
      await neo4jTx.run(`
        MATCH (t:Team {uid: $uid})
        SET t.averageMentalLoad = $load,
            t.isOverloaded = $isOverloaded,
            t.isGlobalReducedSpeed = $isGlobalReducedSpeed,
            t.updatedAt = datetime()
      `, {
        uid: updatedTeam.uid,
        load: load,
        isOverloaded: isOverloaded,
        isGlobalReducedSpeed: isGlobalReducedSpeed
      });

      return updatedTeam;
    });
  }
};
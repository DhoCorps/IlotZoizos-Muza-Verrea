import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';

/**
 * Orchestrateur de Kanban
 * Déplace un Oiseau d'une branche à l'autre via le Squelette d'Acier
 */
export const updateTaskStatusOrchestrator = async (taskUid: string, newStatus: string) => {
  
  // On confie l'atomicité de l'opération à ton Squelette d'Acier
  return await TransactionManager.execute("Mutation Statut Kanban", async (mongoSession, neo4jTx) => {
    
    // 1. MUTATION MONGO (Liée à la session)
    const updatedTask = await TaskModel.findOneAndUpdate(
      { uid: taskUid },
      { 
        $set: { 
          status: newStatus,
          "dates.updatedAt": new Date() 
        } 
      },
      { new: true, session: mongoSession }
    );

    if (!updatedTask) {
      throw new IlotError("Oiseau introuvable dans le Nexus", "NOT_FOUND", 404);
    }

    // 2. SYNCHRONISATION NEO4J (Liée à la transaction)
    const cypher = `
      MATCH (t:Task {uid: $taskUid}) 
      SET t.status = $newStatus, t.updatedAt = datetime()
      RETURN t
    `;
    
    await neo4jTx.run(cypher, { taskUid, newStatus });

    // Le TransactionManager s'occupera de commiter les deux bases dans le bon ordre !
    return { success: true, taskUid, newStatus };
  });
};
// packages/shared-core/src/sync-engine/kanban.orchestrator.ts
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { TaskStatus, CAPABILITIES, ActionSignature } from '@ilot/types'; 

export interface KanbanSyncResult {
  success: boolean;
  mongo: any; 
  neo4j: any;
}

export class KanbanOrchestrator {
  /**
   * 🌀 MISE À JOUR GÉNÉRIQUE (Atome)
   * Remplace 'updateTaskStatus' pour permettre des mutations plus larges.
   * Synchronise le changement d'état entre la Silice (Mongo) et le Graphe (Neo4j).
   */
  async updateTask(
    taskUid: string, 
    updateData: any, 
    signature: ActionSignature 
  ): Promise<KanbanSyncResult> {
    
    // 1. Barrière : A-t-il le droit de muter une tâche ?
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour muter cet Atome.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation Atome Kanban", async (mongoSession, neo4jTx) => {
      
      // On prépare les dates de mutation
      const mongoUpdate = { 
        ...updateData,
        "dates.updatedAt": new Date(),
        ...(updateData.status === 'DONE' ? { "dates.completedAt": new Date() } : {})
      };

      // .lean() assure un objet JS pur
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $set: mongoUpdate },
        { new: true, session: mongoSession }
      ).lean(); 

      if (!updatedTask) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }

      // 2. RÉSONANCE DANS LE GRAPHE (Seulement si le statut change)
      let neoResult = null;
      if (updateData.status) {
        const cypher = `
          MATCH (t:Task {uid: $taskUid}) 
          SET t.status = $newStatus, t.updatedAt = datetime(), t.completedAt = $completedAt
          RETURN t
        `;
        
        neoResult = await neo4jTx.run(cypher, { 
          taskUid, 
          newStatus: updateData.status,
          completedAt: mongoUpdate["dates.completedAt"] ? mongoUpdate["dates.completedAt"].toISOString() : null
        });
      }

      return { 
        success: true, 
        mongo: updatedTask, 
        neo4j: neoResult 
      };
    });
  }

  /**
   * reorderTasks et assignMember restent identiques pour préserver la structure
   */
  async reorderTasks(taskUids: string[], signature: ActionSignature) {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Le vent te repousse. Tu ne peux pas réorganiser ces Atomes.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Réordonnancement Kanban", async (mongoSession) => {
      const operations = taskUids.map((uid, index) => ({
        updateOne: {
          filter: { uid },
          update: { $set: { "metrics.position": index } },
        }
      }));

      await TaskModel.bulkWrite(operations, { session: mongoSession });
      return { success: true, count: taskUids.length };
    });
  }

  async assignMember(taskUid: string, memberUid: string, signature: ActionSignature) {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour tisser ce lien.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Assignation Kanban", async (mongoSession, neo4jTx) => {
      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $addToSet: { assigneeUids: memberUid } },
        { session: mongoSession }
      );

      await neo4jTx.run(
        `MATCH (u:User {uid: $memberUid}), (t:Task {uid: $taskUid})
         MERGE (u)-[r:ASSIGNED_TO]->(t)
         SET r.assignedAt = datetime()
         RETURN r`,
        { memberUid, taskUid }
      );
      return { success: true };
    });
  }
}
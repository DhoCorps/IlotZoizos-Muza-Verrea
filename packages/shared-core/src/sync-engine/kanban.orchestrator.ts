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
   * Résout l'identifiant par MongoDB puis propage l'état dans Neo4j via UID canonique indexé.
   */
  async updateTask(
    taskIdentifier: string, 
    updateData: any, 
    signature: ActionSignature 
  ): Promise<KanbanSyncResult> {
    
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour muter cet Atome.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation Atome Kanban", async (mongoSession, neo4jTx) => {
      
      const mongoUpdate = { 
        ...updateData,
        "dates.updatedAt": new Date(),
        ...(updateData.status === 'DONE' ? { "dates.completedAt": new Date() } : {})
      };

      // 1. Résolution stricte dans la Silice (MongoDB)
      const updatedTask = await TaskModel.findOneAndUpdate(
        { $or: [{ slug: taskIdentifier }, { uid: taskIdentifier }] },
        { $set: mongoUpdate },
        { new: true, session: mongoSession }
      ).lean(); 

      if (!updatedTask) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const canonicalUid = (updatedTask as any).uid;

      // 2. RÉSONANCE DANS LE GRAPHE (Seulement si le statut change)
      let neoResult = null;
      if (updateData.status) {
        const cypher = `
          MATCH (t:Task {uid: $canonicalUid}) 
          SET t.status = $newStatus, t.updatedAt = datetime(), t.completedAt = $completedAt
          RETURN t
        `;
        
        neoResult = await neo4jTx.run(cypher, { 
          canonicalUid, 
          newStatus: updateData.status,
          completedAt: mongoUpdate["dates.completedAt"] ? mongoUpdate["dates.completedAt"].toISOString() : null
        });

        if (neoResult.records.length === 0) {
          throw new IlotError("Atome introuvable dans la Matrice Neo4j.", "NOT_FOUND", 404);
        }
      }

      return { 
        success: true, 
        mongo: updatedTask, 
        neo4j: neoResult 
      };
    });
  }

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

  async assignMember(taskIdentifier: string, memberUid: string, signature: ActionSignature) {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour tisser ce lien.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Assignation Kanban", async (mongoSession, neo4jTx) => {
      const task = await TaskModel.findOne({ 
        $or: [{ slug: taskIdentifier }, { uid: taskIdentifier }] 
      }).session(mongoSession);

      if (!task) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const taskUid = task.uid;

      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $addToSet: { assigneeUids: memberUid } },
        { session: mongoSession }
      );

      const neoResult = await neo4jTx.run(
        `MATCH (u:User {uid: $memberUid}), (t:Task {uid: $taskUid})
         MERGE (u)-[r:ASSIGNED_TO]->(t)
         SET r.assignedAt = datetime()
         RETURN r`,
        { memberUid, taskUid }
      );

      if (neoResult.records.length === 0) {
        throw new IlotError("Impossible de lier l'Oiseau à l'Atome dans le Graphe (Cibles introuvables).", "NOT_FOUND", 404);
      }

      return { success: true };
    });
  }
}
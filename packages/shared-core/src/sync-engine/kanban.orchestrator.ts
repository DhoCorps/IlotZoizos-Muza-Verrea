import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { syncUniversalInteraction } from '@ilot/infrastructure';

export interface KanbanSyncResult {
  success: boolean;
  mongo: any; 
  neo4j: any;
}

export class KanbanOrchestrator {

  /**
   * 🌀 MISE À JOUR GÉNÉRIQUE (Atome Kanban)
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
      
      const mongoUpdate: any = { 
        ...updateData,
        "dates.updatedAt": new Date(),
        ...(updateData.status === 'DONE' ? { "dates.completedAt": new Date() } : {})
      };

      if (updateData.dates) {
        delete mongoUpdate.dates;
        for (const [key, value] of Object.entries(updateData.dates)) {
          mongoUpdate[`dates.${key}`] = value;
        }
      }

      // 1. Résolution stricte dans la Silice (MongoDB) via la recherche unifiée
      const existingTask = await findEntityBySlugOrUid(TaskModel, taskIdentifier);
      if (!existingTask) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: (existingTask as any).uid },
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
          completedAt: mongoUpdate["dates.completedAt"] ? new Date(mongoUpdate["dates.completedAt"]).toISOString() : null
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

  /**
   * 📌 ASSIGNATION D'UN MEMBRE À UN ATOME
   */
  async assignMember(taskIdentifier: string, memberUid: string, signature: ActionSignature) {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour tisser ce lien.", "FORBIDDEN", 403);
    }

    const actorCanonicalUid = signature.actorUid;
    const memberCanonicalUid = memberUid;

    const result = await TransactionManager.execute("Assignation Kanban", async (mongoSession, neo4jTx) => {
      const task = await findEntityBySlugOrUid(TaskModel, taskIdentifier);

      if (!task) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }

      const taskUid = (task as any).uid;

      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $addToSet: { assigneeUids: memberCanonicalUid } },
        { session: mongoSession }
      );

      const neoResult = await neo4jTx.run(
        `MATCH (u:User {uid: $memberUid}), (t:Task {uid: $taskUid})
         MERGE (u)-[r:ASSIGNED_TO]->(t)
         SET r.assignedAt = datetime()
         RETURN r`,
        { memberUid: memberCanonicalUid, taskUid }
      );

      if (neoResult.records.length === 0) {
        throw new IlotError("Impossible de lier l'Oiseau à l'Atome dans le Graphe (Cibles introuvables).", "NOT_FOUND", 404);
      }

      return { success: true };
    });

    // 🕸️ Tissage de la toile universelle (attendu avec await pour s'affranchir du Serverless Vercel)
    if (actorCanonicalUid !== memberCanonicalUid) {
      await syncUniversalInteraction(actorCanonicalUid, memberCanonicalUid, 'TASK');
    }

    return result;
  }
}
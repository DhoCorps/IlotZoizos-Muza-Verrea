import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { safeSyncUniversalInteraction } from '../utils/orchestrator.engine';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

export interface ITaskUpdatePayload {
  status?: string;
  dates?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KanbanSyncResult {
  success: boolean;
  mongo: unknown; 
  neo4j: QueryResult | null;
}

interface ITaskEntity {
  uid: string;
  [key: string]: unknown;
}

export class KanbanOrchestrator {
  /**
   * 🧱 MISE À JOUR GÉRIQUE (Atome Kanban)
   */
  public async updateTask(
    taskIdentifier: string, 
    updateData: ITaskUpdatePayload, 
    signature: ActionSignature
  ): Promise<KanbanSyncResult> {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour muter cet Atome.", "FORBIDDEN", 403);
    }
    return await TransactionManager.execute("Mutation Atome Kanban", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const mongoUpdate: Record<string, unknown> = { 
        ...updateData,
        "dates.updatedAt": now,
        ...(updateData.status === 'DONE' ? { "dates.completedAt": now } : {})
      };
      if (updateData.dates) {
        delete mongoUpdate.dates;
        for (const [key, value] of Object.entries(updateData.dates)) {
          mongoUpdate[`dates.${key}`] = value;
        }
      }

      // 1. Résolution stricte dans la Silice (MongoDB) via la recherche unifiée
      const existingTask = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskEntity | null;
      if (!existingTask) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: existingTask.uid },
        { $set: mongoUpdate },
        { new: true, session: mongoSession }
      ).lean() as unknown as ITaskEntity | null;

      if (!updatedTask) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }
      const canonicalUid = updatedTask.uid;

      // 2. RÉSONANCE DANS LE GRAPHE (Seulement si le statut change)
      let neoResult: QueryResult | null = null;
      if (updateData.status) {
        const cypher = `
          MATCH (t:Task {uid: $canonicalUid}) 
          SET t.status = $newStatus, t.updatedAt = datetime($now), t.completedAt = $completedAt
          RETURN t
        `;
        
        const completedAtValue = mongoUpdate["dates.completedAt"];
        neoResult = await neo4jTx.run(cypher, { 
          canonicalUid, 
          newStatus: updateData.status,
          completedAt: completedAtValue instanceof Date ? completedAtValue.toISOString() : null,
          now: now.toISOString()
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

  public async reorderTasks(taskUids: string[], signature: ActionSignature): Promise<{ success: boolean; count: number }> {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Le vent te repousse. Tu ne peux pas réorganiser ces Atomes.", "FORBIDDEN", 403);
    }
    return await TransactionManager.execute("Réordonnancement Kanban", async (mongoSession: ClientSession) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const operations = taskUids.map((uid, index) => ({
        updateOne: {
          filter: { uid },
          update: { $set: { "metrics.position": index, "dates.updatedAt": now } },
        }
      }));
      await TaskModel.bulkWrite(operations, { session: mongoSession });
      return { success: true, count: taskUids.length };
    });
  }

  /**
   * 🧱 ASSIGNATION D'UN MEMBRE À UN ATOME
   */
  public async assignMember(taskIdentifier: string, memberUid: string, signature: ActionSignature): Promise<{ success: boolean }> {
    if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour tisser ce lien.", "FORBIDDEN", 403);
    }
    const actorCanonicalUid = signature.actorUid;
    const memberCanonicalUid = memberUid;

    const result = await TransactionManager.execute("Assignation Kanban", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const task = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskEntity | null;
      if (!task) {
        throw new IlotError("Atome introuvable dans la Silice", "NOT_FOUND", 404);
      }
      const taskUid = task.uid;
      
      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $addToSet: { assigneeUids: memberCanonicalUid }, $set: { "dates.updatedAt": now } },
        { session: mongoSession }
      );

      const neoResult = await neo4jTx.run(
        `MATCH (u:User {uid: $memberUid}), (t:Task {uid: $taskUid})
         MERGE (u)-[r:ASSIGNED_TO]->(t)
         SET r.assignedAt = datetime($now)
         RETURN r`,
        { memberUid: memberCanonicalUid, taskUid, now: now.toISOString() }
      );

      if (neoResult.records.length === 0) {
        throw new IlotError("Impossible de lier l'Oiseau à l'Atome dans le Graphe (Cibles introuvables).", "NOT_FOUND", 404);
      }
      return { success: true };
    });

    // 🕸️ Tissage de la toile universelle sécurisé via la DLQ centralisée
    if (actorCanonicalUid && actorCanonicalUid !== memberCanonicalUid) {
      await safeSyncUniversalInteraction(actorCanonicalUid, memberCanonicalUid, 'TASK', 'assignMember');
    }

    return result;
  }
}
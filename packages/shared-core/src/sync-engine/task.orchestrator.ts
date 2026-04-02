// packages/shared-core/src/sync-engine/task.orchestrator.ts
import { TaskModel, ProjectModel} from '../../../infrastructure';
import { TransactionManager } from '../../../shared-core/src/sync-engine/transactionManager'
import { ITask } from '../../../types';
import { randomUUID } from 'crypto';

export const TaskOrchestrator = {
  
  async fosterTask(data: Partial<ITask> & { projectUid: string, creatorUid: string }) {
    const project = await ProjectModel.findOne({ uid: data.projectUid });
    if (!project) throw new Error("Chantier parent introuvable.");

    return await TransactionManager.execute("Fondation de Tâche", async (mongoSession, neo4jTx) => {
      const taskUid = `task_${randomUUID()}`;

      const [newTask] = await TaskModel.create([{
        ...data,
        uid: taskUid,
        projectId: project._id,
        assigneeUids: data.assigneeUids || [],
        dates: { createdAt: new Date(), updatedAt: new Date() }
      }], { session: mongoSession });

      const cypher = `
        MATCH (p:Project { uid: $projectUid })
        MATCH (creator:User { uid: $creatorUid })
        
        CREATE (t:Task { 
          uid: $taskUid, 
          title: $title, 
          status: $status,
          pomodorosEst: $pomodorosEst,
          pomodorosDone: $pomodorosDone
        })
        
        MERGE (t)-[:TASK_OF]->(p)
        MERGE (creator)-[:CREATED]->(t)
        
        // 🛰️ TISSAGE DE L'ESCOUADE
        WITH t
        UNWIND $assigneeUids AS aUid
        MATCH (bird:User { uid: aUid })
        MERGE (bird)-[:ASSIGNED_TO]->(t)
        
        RETURN t.uid
      `;

      await neo4jTx.run(cypher, {
        projectUid: data.projectUid,
        creatorUid: data.creatorUid,
        assigneeUids: newTask.assigneeUids,
        taskUid: newTask.uid,
        title: newTask.content.title,
        status: newTask.status,
        pomodorosEst: newTask.pomodoros.estimated,
        pomodorosDone: newTask.pomodoros.completed
      });

      return newTask;
    });
  },

  async mutateTask(taskUid: string, updates: Partial<ITask>) {
    return await TransactionManager.execute("Mutation de Tâche", async (mongoSession, neo4jTx) => {
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $set: { ...updates, "dates.updatedAt": new Date() } },
        { new: true, session: mongoSession }
      );

      if (!updatedTask) throw new Error("Tâche introuvable.");

      // Si l'escouade change, on met à jour les liens dans le Graphe
      if (updates.assigneeUids) {
        await neo4jTx.run(`
          MATCH (t:Task { uid: $taskUid })
          OPTIONAL MATCH (oldBird:User)-[r:ASSIGNED_TO]->(t)
          DELETE r
          WITH t
          UNWIND $newUids AS aUid
          MATCH (newBird:User { uid: aUid })
          MERGE (newBird)-[:ASSIGNED_TO]->(t)
        `, { taskUid, newUids: updates.assigneeUids });
      }

      return updatedTask;
    });
  }
};
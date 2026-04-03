import { TaskModel, ProjectModel, TaskDocument } from '../../../infrastructure';
import { TransactionManager } from './transactionManager';
import { ITask, TaskStatus } from '../../../types';
import { randomUUID } from 'crypto';

/**
 * TaskOrchestrator : Le chef d'orchestre de l'Îlot Zoizos.
 * Assure la double-suture atomique entre MongoDB (Silice) et Neo4j (Graphe).
 */
export const TaskOrchestrator = {
  
  /**
   * 🐣 fosterTask : Fondation d'un nouvel Atome de travail.
   */
  async fosterTask(data: Partial<ITask> & { projectUid: string; creatorUid: string }) {
    // 🛡️ Rouage 1 : Validation Fail-fast du parent
    const project = await ProjectModel.findOne({ uid: data.projectUid });
    if (!project) throw new Error("Chantier parent (Project) introuvable.");

    return await TransactionManager.execute("Fondation de Tâche", async (mongoSession, neo4jTx) => {
      const taskUid = `task_${randomUUID()}`;

      // 🧪 Rouage 2 : Cristallisation dans la Silice (MongoDB)
      const created = await TaskModel.create([{
        ...data,
        uid: taskUid,
        projectId: project._id,
        projectUid: project.uid, // On s'assure que l'UID est bien propagé
        creatorUid: data.creatorUid,
        content: {
          title: data.content?.title || "Atome sans nom",
          description: data.content?.description || "",
          tags: data.content?.tags || []
        },
        status: data.status || TaskStatus.TODO,
        assigneeUids: data.assigneeUids || [],
        pomodoros: {
          estimated: data.pomodoros?.estimated || 1,
          completed: 0
        },
        dates: { 
          createdAt: new Date(), 
          updatedAt: new Date() 
        }
      }], { session: mongoSession });

      // Extraction chirurgicale avec garantie de type
      const newTask = (created as unknown as TaskDocument[])[0];

      // 🕸️ Rouage 3 : Tissage dans le Graphe (Neo4j)
      const cypher = `
        MERGE (p:Project { uid: $projectUid })
        MERGE (creator:User { uid: $creatorUid })
        
        CREATE (t:Task { 
          uid: $taskUid, 
          title: $title, 
          status: $status,
          pomodorosEst: toInteger($pomodorosEst),
          pomodorosDone: toInteger($pomodorosDone)
        })
        
        MERGE (t)-[:TASK_OF]->(p)
        MERGE (creator)-[:CREATED]->(t)
        
        WITH t
        OPTIONAL MATCH (bird:User) WHERE bird.uid IN $assigneeUids
        FOREACH (ignore IN CASE WHEN bird IS NOT NULL THEN [1] ELSE [] END |
          MERGE (bird)-[:ASSIGNED_TO]->(t)
        )
        
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

  /**
   * 🛠️ updateTask : Mutation d'un Atome existant.
   */
  async updateTask(taskUid: string, updates: Partial<ITask>) {
    return await TransactionManager.execute("Mutation de Tâche", async (mongoSession, neo4jTx) => {
      
      // 1. Mise à jour dans MongoDB
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $set: { ...updates, "dates.updatedAt": new Date() } },
        { new: true, session: mongoSession }
      );

      if (!updatedTask) throw new Error("Atome de travail introuvable.");

      // Conversion en objet simple pour la suite (évite les conflits de types Document)
      const taskData = typeof updatedTask.toObject === 'function' 
        ? updatedTask.toObject() 
        : updatedTask;

      // 2. Synchronisation du Graphe
      const needsGraphUpdate = updates.content?.title || updates.status || updates.assigneeUids;

      if (needsGraphUpdate) {
        let updatePropsCypher = `MATCH (t:Task { uid: $taskUid }) SET t.status = $status `;
        if (updates.content?.title) {
          updatePropsCypher += `, t.title = $title `;
        }

        await neo4jTx.run(updatePropsCypher, { 
          taskUid, 
          status: taskData.status, 
          title: taskData.content.title 
        });
        
        if (updates.assigneeUids) {
          await neo4jTx.run(`
            MATCH (t:Task { uid: $taskUid })
            OPTIONAL MATCH (oldBird:User)-[r:ASSIGNED_TO]->(t)
            DELETE r
            WITH t
            UNWIND $newUids AS aUid
            MATCH (newBird:User { uid: aUid })
            MERGE (newBird)-[:ASSIGNED_TO]->(t)
          `, { 
            taskUid, 
            newUids: updates.assigneeUids 
          });
        }
      }
      
      return updatedTask;
    });
  },

  /**
   * 🗑️ disintegrateTask : Effacement des traces.
   */
  async disintegrateTask(taskUid: string) {
    return await TransactionManager.execute("Désintégration de Tâche", async (mongoSession, neo4jTx) => {
      await TaskModel.findOneAndDelete({ uid: taskUid }, { session: mongoSession });
      await neo4jTx.run(`
        MATCH (t:Task { uid: $taskUid })
        DETACH DELETE t
      `, { taskUid });
    });
  }
};
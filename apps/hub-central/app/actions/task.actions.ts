"use server";

import { revalidatePath } from 'next/cache';
import { TaskModel } from '@ilot/infrastructure';
import { TransactionManager } from '../../../../packages/shared-core/src/sync-engine/transactionManager';
import { ITask } from '@ilot/types';

/**
 * 🌟 CRÉATION : Fonder un Atome
 * Synchronise la création dans MongoDB et Neo4j.
 */
export async function createTaskAction(data: Partial<ITask> & { projectUid: string, creatorUid: string }) {
  try {
    const result = await TransactionManager.execute("Fondation Atome", async (mongoSession, neo4jTx) => {
      // 1. MongoDB
      const newTask = new TaskModel(data);
      await newTask.save({ session: mongoSession });

      // 2. Neo4j : Création du nœud et lien avec le projet
      await neo4jTx.run(
        `MATCH (p:Project {uid: $projectUid})
         CREATE (t:Task {
           uid: $uid, 
           title: $title, 
           priority: $priority, 
           mentalLoad: $mentalLoad,
           pomodorosEstimated: $pomoEst
         })
         CREATE (p)-[:HAS_TASK]->(t)
         RETURN t`,
        { 
          projectUid: data.projectUid,
          uid: newTask.uid,
          title: data.content?.title,
          priority: data.priority,
          mentalLoad: data.metrics?.mentalLoad,
          pomoEst: data.pomodoros?.estimated
        }
      );

      return newTask;
    });

    revalidatePath('/tom-hat-toes');
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("❌ [TaskAction] Erreur de création :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📖 LECTURE : Extraire les Atomes d'un Chantier
 */
export async function fetchTasksAction(projectId: string) {
  try {
    const tasks = await TaskModel.find({ projectUid: projectId }).sort({ "dates.createdAt": -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: any) {
    return { success: false, error: "Impossible de lire la Silice." };
  }
}

/**
 * 🎭 MUTATION : Migration de Statut (Kanban)
 */
export async function updateTaskStatusAction(taskUid: string, newStatus: string) {
  try {
    await TransactionManager.execute("Migration Statut", async (mongoSession, neo4jTx) => {
      // 1. MongoDB
      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { status: newStatus, "dates.updatedAt": new Date() },
        { session: mongoSession }
      );

      // 2. Neo4j
      await neo4jTx.run(
        `MATCH (t:Task {uid: $taskUid}) SET t.status = $newStatus, t.updatedAt = datetime()`,
        { taskUid, newStatus }
      );
    });

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🍅 POMODORO : Valider un Cycle
 */
export async function completePomodoroAction(taskUid: string) {
  try {
    const result = await TransactionManager.execute("Validation Pomodoro", async (mongoSession, neo4jTx) => {
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { 
          $inc: { "pomodoros.completed": 1 },
          $set: { "dates.updatedAt": new Date() }
        },
        { new: true, session: mongoSession }
      );

      await neo4jTx.run(
        `MATCH (t:Task {uid: $taskUid}) 
         SET t.pomodorosDone = t.pomodorosDone + 1, t.updatedAt = datetime()`,
        { taskUid }
      );

      return updatedTask;
    });

    revalidatePath('/tom-hat-toes');
    return { success: true, newCount: result?.pomodoros?.completed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 📅 PLANIFICATION : Inscription au Calendrier
 */
export async function scheduleTaskAction(taskUid: string, scheduledAt: Date) {
  try {
    await TransactionManager.execute("Planification Temporelle", async (mongoSession, neo4jTx) => {
      await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $set: { "dates.scheduledAt": scheduledAt } },
        { session: mongoSession }
      );

      await neo4jTx.run(
        `MATCH (t:Task {uid: $taskUid}) SET t.scheduledAt = datetime($date)`,
        { taskUid, date: scheduledAt.toISOString() }
      );
    });

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🧨 DISSOLUTION : Supprimer un Atome
 */
export async function deleteTaskAction(taskUid: string) {
  try {
    await TransactionManager.execute("Dissolution Atome", async (mongoSession, neo4jTx) => {
      await TaskModel.findOneAndDelete({ uid: taskUid }, { session: mongoSession });
      await neo4jTx.run(`MATCH (t:Task {uid: $taskUid}) DETACH DELETE t`, { taskUid });
    });

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
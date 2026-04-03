"use server";

import { revalidatePath } from 'next/cache';
import { TaskOrchestrator } from '../../../../packages/shared-core';
import { updateTaskStatusOrchestrator } from '../../../../packages/shared-core';
import { TransactionManager } from '../../../../packages/shared-core/src/sync-engine/transactionManager';
import { TaskModel } from '@ilot/infrastructure';
import { ITask } from '@ilot/types';

/**
 * 🌟 C : CREATE (Fondation d'un nouvel oiseau)
 */
export async function createTaskAction(
  data: Partial<ITask> & { projectUid: string, creatorUid: string }
) {
  try {
    const result = await TaskOrchestrator.fosterTask(data);
    revalidatePath('/kanban');
    return { success: true, data: result };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la fondation :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📖 R : READ (Lecture de la matrice pour alimenter le tableau)
 * Pas besoin de TransactionManager ici, on lit simplement la Silice.
 */
export async function fetchKanbanTasksAction(projectId: string) {
  try {
    // On suppose ici qu'on filtre par l'ObjectId du projet parent
    const tasks = await TaskModel.find({ projectId }).lean();
    return { success: true, data: tasks };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la lecture :", error.message);
    return { success: false, error: "Impossible de lire la Silice." };
  }
}

/**
 * 🎭 U : UPDATE (Déplacement sur le Kanban)
 * Utilise l'orchestrateur spécifique qu'on a refactorisé avec le Squelette d'Acier.
 */
export async function moveTaskAction(taskUid: string, newStatus: string) {
  try {
    const result = await updateTaskStatusOrchestrator(taskUid, newStatus);
    revalidatePath('/kanban');
    return { success: true, message: `L'oiseau a migré vers ${newStatus}` };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la migration :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🧨 D : DELETE (Dissolution de la tâche)
 * Note : Il faudra ajouter un 'dissolveTask' dans ton TaskOrchestrator 
 * sur le même modèle que 'dissolveProject' pour gérer Neo4j + Mongo.
 */
export async function deleteTaskAction(taskUid: string) {
  try {
    // Appel futur vers ton Squelette d'Acier :
    // await TaskOrchestrator.dissolveTask(taskUid);
    
    revalidatePath('/kanban');
    return { success: true, message: "L'oiseau a été libéré de la matrice." };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la dissolution :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🍅 P : POMODORO (Valider un cycle d'effort)
 * Incrémente le compteur de Pomodoros terminés d'un atome (Tâche) via le Squelette d'Acier.
 */
export async function completePomodoroAction(taskUid: string) {
  try {
    const result = await TransactionManager.execute("Validation Pomodoro", async (mongoSession, neo4jTx) => {
      
      // 1. SILICE (MongoDB) : Incrémenter le compteur
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { 
          $inc: { "pomodoros.completed": 1 },
          $set: { "dates.updatedAt": new Date() }
        },
        { new: true, session: mongoSession }
      );

      if (!updatedTask) throw new Error("Atome introuvable dans la matrice.");

      // 2. GRAPHE (Neo4j) : Maintenir le miroir à jour
      await neo4jTx.run(
        `MATCH (t:Task {uid: $taskUid}) 
         SET t.pomodorosDone = t.pomodorosDone + 1, t.updatedAt = datetime()
         RETURN t`,
        { taskUid }
      );

      return updatedTask;
    });

    // Rafraîchissement global pour que le compteur s'incrémente visuellement sur la carte
    revalidatePath('/');

    return { success: true, newCount: result.pomodoros.completed };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la validation Pomodoro :", error.message);
    return { success: false, error: error.message };
  }
}
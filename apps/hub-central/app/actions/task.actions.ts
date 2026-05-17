"use server";

import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth/next";
import { TaskModel, getNeo4jSession } from '../../../../packages/infrastructure'; 
// ✅ Import de l'Orchestrateur ET de la Signature
import { TaskOrchestrator, ActionSignature } from '@ilot/shared-core'; 
import { ITask, TaskStatus, CAPABILITIES } from '@ilot/types';
import { authOptions } from "../../lib/auth"; // 🪡 SUTURE : Activé pour getServerSession

/**
 * 🛡️ UTILITAIRE DE DOUANE (Spécifique aux Server Actions)
 * Récupère les droits de l'Oiseau via le Graphe Muet.
 */
async function getTaskActionCapabilities(userUid: string, taskUid?: string, projectUid?: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    let cypher = `MATCH (u:User {uid: $userUid})`;
    let params: any = { userUid };

    // Si on a la tâche, on cherche les droits organiques + ceux du projet parent
    if (taskUid) {
      cypher += `
        MATCH (t:Task {uid: $taskUid})
        // 🪡 SUTURE : Direction alignée (t)-[:TASK_OF]->(p)
        OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
        OPTIONAL MATCH (u)-[rDirect:ASSIGNED_TO|CREATED]->(t)
        OPTIONAL MATCH (u)-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
        RETURN rDirect IS NOT NULL AS isDirectlyInvolved, rProj.capabilities AS projectCaps
      `;
      params.taskUid = taskUid;
    } 
    // Si on a que le projet (pour la création), on cherche juste les droits du projet
    else if (projectUid) {
      cypher += `
        MATCH (p:Project {uid: $projectUid})
        OPTIONAL MATCH (u)-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
        RETURN false AS isDirectlyInvolved, rProj.capabilities AS projectCaps
      `;
      params.projectUid = projectUid;
    } else {
      return []; // Ni tâche ni projet fournis, on bloque.
    }

    const result = await session.run(cypher, params);
    if (result.records.length === 0) return []; 

    const record = result.records[0];
    const isDirectlyInvolved = record.get('isDirectlyInvolved');
    const projectCaps = record.get('projectCaps') || [];

    let compiledCaps = [...projectCaps];
    if (isDirectlyInvolved) {
        if (!compiledCaps.includes(CAPABILITIES.TASK.READ)) compiledCaps.push(CAPABILITIES.TASK.READ);
        if (!compiledCaps.includes(CAPABILITIES.TASK.UPDATE)) compiledCaps.push(CAPABILITIES.TASK.UPDATE);
    }
    return compiledCaps;
  } finally {
    await session.close();
  }
}

/**
 * 🌟 CRÉATION : Fonder un Atome
 */
export async function createTaskAction(data: Partial<ITask> & { projectUid: string }) {
  try {
    // 1. Qui es-tu ? (Douane Absolue sur Server Action)
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Le Nexus est fermé. Connecte-toi.");

    // 2. Que peux-tu faire ?
    const caps = await getTaskActionCapabilities(userUid, undefined, data.projectUid);
    if (!caps.includes(CAPABILITIES.TASK.CREATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour forger un Atome sur ce Chantier.");
    }

    // 3. 🛡️ Signature
    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator(); // ✅ Instanciation

    // L'Orchestrateur reçoit data ET signature (creatorUid est déduit de la signature)
    const result = await taskOrch.fosterTask(data, signature);

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
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getTaskActionCapabilities(userUid, undefined, projectId);
    if (!caps.includes(CAPABILITIES.PROJECT.READ) && !caps.includes('*')) {
      throw new Error("Accès interdit à ce Chantier.");
    }

    const tasks = await TaskModel.find({ projectUid: projectId }).sort({ "dates.createdAt": -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🎭 MUTATION : Migration de Statut (Kanban)
 */
export async function updateTaskStatusAction(taskUid: string, newStatus: string) {
  try {
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour muter cet Atome.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.updateTask(taskUid, { status: newStatus as TaskStatus }, signature);

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
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    // Pour rajouter du temps, il faut le droit d'UPDATE
    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Seul l'artisan lié à cet Atome peut y insuffler du temps.");
    }

    // 🩸 SUTURE : Volatilité dans MongoDB uniquement
    const updatedTask = await TaskModel.findOneAndUpdate(
      { uid: taskUid },
      { 
        $inc: { "pomodoros.completed": 1 },
        $set: { "dates.updatedAt": new Date() }
      },
      { new: true }
    );

    revalidatePath('/tom-hat-toes');
    return { success: true, newCount: updatedTask?.pomodoros?.completed };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 📅 PLANIFICATION : Inscription au Calendrier
 */
export async function scheduleTaskAction(taskUid: string, scheduledAt: Date | null) {
  try {
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    // Le droit d'UPDATE suffit pour planifier
    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Tu n'as pas le droit de déplacer cet Atome dans le temps.");
    }

    await TaskModel.findOneAndUpdate(
      { uid: taskUid },
      { 
        $set: { 
          "dates.scheduledAt": scheduledAt,
          "dates.updatedAt": new Date()
        } 
      }
    );

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
    const session = await getServerSession(authOptions); // 🪡 SUTURE : authOptions ajouté
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.DELETE) && !caps.includes('*')) {
      throw new Error("La désintégration requiert l'aura de l'Architecte.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.disintegrateTask(taskUid, signature);

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
"use server";

import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth/next";
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { TaskOrchestrator, ActionSignature } from '@ilot/shared-core'; 
import { ITask, TaskStatus, CAPABILITIES } from '@ilot/types';
import { authOptions } from "../../lib/auth";

/**
 * 🛡️ UTILITAIRE DE DOUANE
 * Récupère les droits de l'Oiseau et suture la capacité DELETE si nécessaire.
 */
async function getTaskActionCapabilities(userUid: string, taskUid?: string, projectUid?: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    let cypher = `MATCH (u:User {uid: $userUid})`;
    let params: Record<string, unknown> = { userUid };

    if (taskUid) {
      cypher += `
        MATCH (t:Task {uid: $taskUid})
        OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
        OPTIONAL MATCH (u)-[rDirect:ASSIGNED_TO|CREATED]->(t)
        OPTIONAL MATCH (u)-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
        RETURN rDirect IS NOT NULL AS isDirectlyInvolved, rProj.capabilities AS projectCaps
      `;
      params.taskUid = taskUid;
    } 
    else if (projectUid) {
      cypher += `
        MATCH (p:Project {uid: $projectUid})
        OPTIONAL MATCH (u)-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
        RETURN false AS isDirectlyInvolved, rProj.capabilities AS projectCaps
      `;
      params.projectUid = projectUid;
    } else {
      return [];
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
        if (!compiledCaps.includes(CAPABILITIES.TASK.DELETE)) compiledCaps.push(CAPABILITIES.TASK.DELETE);
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
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Le Nexus est fermé. Connecte-toi.");

    const caps = await getTaskActionCapabilities(userUid, undefined, data.projectUid);
    if (!caps.includes(CAPABILITIES.TASK.CREATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour forger un Atome sur ce Chantier.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    const result = await taskOrch.fosterTask(data, signature);

    revalidatePath('/tom-hat-toes');
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    console.error("❌ [TaskAction] Erreur de création :", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 📖 LECTURE : Extraire les Atomes d'un Chantier
 */
export async function fetchTasksAction(projectId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getTaskActionCapabilities(userUid, undefined, projectId);
    if (!caps.includes(CAPABILITIES.PROJECT.READ) && !caps.includes('*')) {
      throw new Error("Accès interdit à ce Chantier.");
    }

    const tasks = await TaskModel.find({ projectUid: projectId }).sort({ "dates.createdAt": -1 }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

export async function updateTaskAction(taskUid: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const updates = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
      pomoEst: Number(formData.get('pomoEst')),
      complexity: Number(formData.get('complexity')),
      status: formData.get('status') as string,
      assigneeUids: formData.getAll('assignees') as string[] 
    };

    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour muter cet Atome.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.updateTask(taskUid, updates, signature);

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    console.error("❌ [TaskAction] Erreur de mise à jour :", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 🎭 MUTATION : Migration de Statut (Kanban)
 */
export async function updateTaskStatusAction(taskUid: string, newStatus: string) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

/**
 * 🍅 POMODORO : Valider un Cycle (Harmonisé via TaskOrchestrator)
 */
export async function completePomodoroAction(taskUid: string) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getTaskActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Seul l'artisan lié à cet Atome peut y insuffler du temps.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    // 🪡 SUTURE : Appel unifié à l'orchestrateur (Silice + Matrice Neo4j FOCUSED_ON)
    const updatedTask = await taskOrch.completePomodoro(taskUid, signature);

    revalidatePath('/tom-hat-toes');
    return { success: true, newCount: updatedTask?.pomodoros?.completed };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

export async function scheduleTaskAction(taskUid: string, scheduledAt: Date) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Accès refusé.");

    const taskOrch = new TaskOrchestrator();
    
    await taskOrch.updateTask(taskUid, { 
      "dates.scheduledAt": scheduledAt,
      "dates.updatedAt": new Date() 
    }, { actorUid: userUid, capabilities: ['task:update'] });

    revalidatePath('/tom-hat-toes');
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

/**
 * 🧨 DISSOLUTION : Supprimer un Atome
 */
export async function deleteTaskAction(taskUid: string) {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}
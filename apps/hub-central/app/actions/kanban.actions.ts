"use server";

import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; 
import { TaskOrchestrator, ActionSignature } from '@ilot/shared-core';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { ITask, TaskStatus, CAPABILITIES } from '@ilot/types';

// 🛡️ TYPEDEF UNIFIÉ : Extraction propre via Omit pour tolérer le `null` sur scheduledAt sans `any`
type BaseFosterPayload = Parameters<TaskOrchestrator['fosterTask']>[0];

export type CreateTaskInput = Omit<BaseFosterPayload, 'scheduledAt'> & {
  projectUid: string;
  scheduledAt?: Date | string | null;
};

/**
 * 🛡️ UTILITAIRE DE DOUANE
 * Vérifie les droits organiques (Tâche) ou ascendants (Projet).
 */
async function getKanbanActionCapabilities(userUid: string, taskUid?: string, projectUid?: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    let cypher = `MATCH (u:User {uid: $userUid})`;
    const params: Record<string, unknown> = { userUid };

    if (taskUid) {
      cypher += `
        MATCH (t:Task {uid: $taskUid})
        OPTIONAL MATCH (t)-[:TASK_OF]->(p:Project)
        OPTIONAL MATCH (u)-[rDirect:ASSIGNED_TO|CREATED]->(t)
        OPTIONAL MATCH (u)-[rProj:CONTRIBUTES_TO|OWNER_OF]->(p)
        RETURN rDirect IS NOT NULL AS isDirectlyInvolved, rProj.capabilities AS projectCaps
      `;
      params.taskUid = taskUid;
    } else if (projectUid) {
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
    const isDirectlyInvolved = record.get('isDirectlyInvolved') as boolean;
    const projectCaps = (record.get('projectCaps') as string[]) || [];

    const compiledCaps = [...projectCaps];
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
 * 🌟 C : CREATE (Fondation d'un nouvel Atome)
 */
export async function createTaskAction(data: CreateTaskInput) {
  try {
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Le Nexus est fermé. Connecte-toi.");

    const caps = await getKanbanActionCapabilities(userUid, undefined, data.projectUid);
    if (!caps.includes(CAPABILITIES.TASK.CREATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour forger un Atome.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    const payload = {
      ...data,
      scheduledAt: data.scheduledAt === null ? undefined : data.scheduledAt
    };

    type ExpectedFosterTaskPayload = Parameters<typeof taskOrch.fosterTask>[0];

    const result = await taskOrch.fosterTask(payload as unknown as ExpectedFosterTaskPayload, signature);
    revalidatePath('/tom-hat-toes'); 
    
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

/**
 * 📖 R : READ (Lecture de la matrice pour alimenter le tableau)
 */
export async function fetchKanbanTasksAction(projectUid: string) {
  try {
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, undefined, projectUid);
    if (!caps.includes(CAPABILITIES.PROJECT.READ) && !caps.includes('*')) {
      throw new Error("L'accès à ce Chantier t'est interdit.");
    }

    const tasks = await TaskModel.find({ projectUid }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    return { success: false, error: errorMessage };
  }
}

/**
 * 🎭 U : UPDATE (Déplacement sur le Kanban)
 */
export async function moveTaskAction(taskUid: string, newStatus: TaskStatus) {
  try {
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Tu n'as pas le droit de déplacer cet Oiseau.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.updateTask(taskUid, { status: newStatus }, signature);
    
    revalidatePath('/tom-hat-toes'); 
    return { success: true, message: `L'oiseau a migré vers ${newStatus}` };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    console.error("❌ [ACTION] Échec de la migration :", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 🧨 D : DELETE (Dissolution de la tâche)
 */
export async function deleteTaskAction(taskUid: string) {
  try {
    const session = await getServerSession(authOptions); 
    const userUid = (session?.user as { uid?: string })?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.DELETE) && !caps.includes('*')) {
      throw new Error("La désintégration de cet Atome est réservée à l'Architecte.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.disintegrateTask(taskUid, signature);
    
    revalidatePath('/tom-hat-toes'); 
    return { success: true, message: "L'oiseau a été libéré de la matrice." };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inattendue.';
    console.error("❌ [ACTION] Échec de la dissolution :", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * 🍅 P : POMODORO (Valider un cycle d'effort)
 */
export async function completePomodoroAction(taskUid: string): Promise<{ 
  success: boolean; 
  newCount?: number; 
  error?: string; 
}> {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as { uid?: string })?.uid;
    const sessionCaps = (session?.user as { capabilities?: string[] })?.capabilities || [];

    if (!userUid) {
      return { success: false, error: "Oiseau non identifié. Le flux temporel est rompu." }; 
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: sessionCaps };
    const taskOrch = new TaskOrchestrator();
    
    // 🎯 L'orchestrateur retourne directement l'atome ITask mis à jour
    const updatedTask = await taskOrch.completePomodoro(taskUid, signature);

    return { success: true, newCount: updatedTask.pomodoros?.completed || 1 };

  } catch (error: unknown) {
    console.error("🔥 Fracture lors de la sédimentation du temps :", error);
    return { success: false, error: "Impossible de sceller l'effort dans la Silice." };
  }
}
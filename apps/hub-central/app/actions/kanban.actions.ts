"use server";

import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth"; // 🪡 SUTURE : On importe les options pour activer la session
import { TaskOrchestrator, ActionSignature } from '@ilot/shared-core';
import { TaskModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { ITask, TaskStatus, CAPABILITIES } from '@ilot/types';

/**
 * 🛡️ UTILITAIRE DE DOUANE
 * Vérifie les droits organiques (Tâche) ou ascendants (Projet).
 */
async function getKanbanActionCapabilities(userUid: string, taskUid?: string, projectUid?: string): Promise<string[]> {
  const session = getNeo4jSession();
  try {
    let cypher = `MATCH (u:User {uid: $userUid})`;
    let params: any = { userUid };

    if (taskUid) {
      cypher += `
        MATCH (t:Task {uid: $taskUid})
        // 🪡 SUTURE : On suit la direction Task -> Project (t)-[:TASK_OF]->(p)
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
 * 🌟 C : CREATE (Fondation d'un nouvel Atome)
 */
export async function createTaskAction(
  data: Partial<ITask> & { projectUid: string } 
) {
  try {
    // 1. Authentification
    const session = await getServerSession(authOptions); // 🪡 SUTURE : Ajout authOptions
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Le Nexus est fermé. Connecte-toi.");

    // 2. Autorisation (Douane)
    const caps = await getKanbanActionCapabilities(userUid, undefined, data.projectUid);
    if (!caps.includes(CAPABILITIES.TASK.CREATE) && !caps.includes('*')) {
      throw new Error("Aura insuffisante pour forger un Atome.");
    }

    // 3. 🛡️ Signature & Instanciation
    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    const result = await taskOrch.fosterTask(data, signature);
    revalidatePath('/tom-hat-toes'); // 🪡 SUTURE : On revalide le chemin réel du hub
    
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la fondation :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📖 R : READ (Lecture de la matrice pour alimenter le tableau)
 */
export async function fetchKanbanTasksAction(projectUid: string) {
  try {
    const session = await getServerSession(authOptions); // 🪡 SUTURE : Ajout authOptions
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, undefined, projectUid);
    if (!caps.includes(CAPABILITIES.PROJECT.READ) && !caps.includes('*')) {
      throw new Error("L'accès à ce Chantier t'est interdit.");
    }

    const tasks = await TaskModel.find({ projectUid }).lean();
    return { success: true, data: JSON.parse(JSON.stringify(tasks)) };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la lecture :", error.message);
    return { success: false, error: "Impossible de lire la Silice." };
  }
}

/**
 * 🎭 U : UPDATE (Déplacement sur le Kanban)
 */
export async function moveTaskAction(taskUid: string, newStatus: TaskStatus) {
  try {
    const session = await getServerSession(authOptions); // 🪡 SUTURE : Ajout authOptions
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.UPDATE) && !caps.includes('*')) {
      throw new Error("Tu n'as pas le droit de déplacer cet Oiseau.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.updateTask(taskUid, { status: newStatus }, signature);
    
    revalidatePath('/tom-hat-toes'); // 🪡 SUTURE : Cohérence du chemin
    return { success: true, message: `L'oiseau a migré vers ${newStatus}` };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la migration :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🧨 D : DELETE (Dissolution de la tâche)
 */
export async function deleteTaskAction(taskUid: string) {
  try {
    const session = await getServerSession(authOptions); // 🪡 SUTURE : Ajout authOptions
    const userUid = (session?.user as any)?.uid;
    if (!userUid) throw new Error("Non autorisé.");

    const caps = await getKanbanActionCapabilities(userUid, taskUid);
    if (!caps.includes(CAPABILITIES.TASK.DELETE) && !caps.includes('*')) {
      throw new Error("La désintégration de cet Atome est réservée à l'Architecte.");
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: caps };
    const taskOrch = new TaskOrchestrator();

    await taskOrch.disintegrateTask(taskUid, signature);
    
    revalidatePath('/tom-hat-toes'); // 🪡 SUTURE : Cohérence du chemin
    return { success: true, message: "L'oiseau a été libéré de la matrice." };
  } catch (error: any) {
    console.error("❌ [ACTION] Échec de la dissolution :", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🍅 P : POMODORO (Valider un cycle d'effort)
 */
/**
 * ⚡ ACTION SERVEUR : Valide la fin d'un cycle de Sédimentation (Pomodoro)
 */
export async function completePomodoroAction(taskUid: string): Promise<{ 
  success: boolean; 
  newCount?: number; 
  error?: string; 
}> {
  try {
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    const sessionCaps = (session?.user as any)?.capabilities || [];

    if (!userUid) {
      // 🪡 On retourne false au lieu de faire crasher la requête
      return { success: false, error: "Oiseau non identifié. Le flux temporel est rompu." }; 
    }

    const signature: ActionSignature = { actorUid: userUid, capabilities: sessionCaps };
    const taskOrch = new TaskOrchestrator();
    
    const result = await taskOrch.completePomodoro(taskUid, signature);

    return { success: true, newCount: result.pomodoros.completed };

  } catch (error: any) {
    console.error("🔥 Fracture lors de la sédimentation du temps :", error);
    // 🪡 On retourne false ici aussi
    return { success: false, error: "Impossible de sceller l'effort dans la Silice." };
  }
}


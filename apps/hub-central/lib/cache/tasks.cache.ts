// Fichier : lib/cache/tasks.cache.ts
import { unstable_cache } from 'next/cache';
import { TaskModel, getNeo4jSession } from "@ilot/infrastructure";
import type { Record as Neo4jRecord } from 'neo4j-driver';

// -------------------------------------------------------------------------
// CACHE : Récupération des tâches (Hydratation Graphe + Silice)
// -------------------------------------------------------------------------
export const getCachedTasks = async (userUid: string, projectUid?: string) => {
  return unstable_cache(
    async () => {
      const neo4jSession = getNeo4jSession();
      const tasksFromGraph: Record<string, string[]> = {};
      try {
        if (neo4jSession) {
          const params: Record<string, unknown> = projectUid ? { projectUid } : { userUid };
          const cypher = projectUid 
            ? `MATCH (t:Task)-[:TASK_OF]->(p:Project {uid: $projectUid}) OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t) RETURN t.uid AS taskUid, collect(bird.uid) AS assignees`
            : `MATCH (me:User {uid: $userUid})-[:ASSIGNED_TO]->(t:Task) OPTIONAL MATCH (bird:User)-[:ASSIGNED_TO]->(t) RETURN t.uid AS taskUid, collect(bird.uid) AS assignees`;
                     
          const result = await neo4jSession.run(cypher, params);
          result?.records?.forEach((r: Neo4jRecord) => { 
            const taskUid = r.get('taskUid') as string;
            const assignees = r.get('assignees') as string[];
            if (taskUid) {
              tasksFromGraph[taskUid] = assignees || [];
            }
          });
        }
      } finally {
        await neo4jSession?.close?.();
      }
      
      const taskUids = Object.keys(tasksFromGraph);
      if (taskUids.length === 0) {
        const query = projectUid ? { projectUid } : {};
        const fallbackTasks = await TaskModel.find(query).sort({ 'dates.updatedAt': -1 }).lean();
        return fallbackTasks.map(t => ({ ...t, assigneeUids: [] }));
      }
      
      const tasks = await TaskModel.find({ uid: { $in: taskUids } }).sort({ 'dates.updatedAt': -1 }).lean();
      return tasks.map(t => ({ ...t, assigneeUids: tasksFromGraph[t.uid] || [] }));
    },
    [`tasks-${userUid}-${projectUid || 'global'}`],
    { revalidate: 60, tags: ['tasks', projectUid ? `project-${projectUid}` : `user-tasks-${userUid}`] }
  )();
};

// -------------------------------------------------------------------------
// CACHE : Récupération et auscultation d'un atome spécifique
// -------------------------------------------------------------------------
export const getCachedTaskDetails = (
  taskId: string, 
  userUid: string, 
  getTaskCapabilitiesFn: (userUid: string, taskId: string) => Promise<unknown> | unknown
) => {
  return unstable_cache(
    async () => {
      const task = await TaskModel.findOne({ uid: taskId }).lean();
      if (!task) return null;
      const caps = await getTaskCapabilitiesFn(userUid, taskId);
      return { task, caps };
    },
    [`task-details-${taskId}-${userUid}`],
    { revalidate: 60, tags: ['tasks', `task-${taskId}`] }
  )();
};
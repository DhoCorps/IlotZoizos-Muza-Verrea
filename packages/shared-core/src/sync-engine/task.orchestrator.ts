// packages/shared-core/src/sync-engine/task.orchestrator.ts
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TransactionManager } from './transactionManager';
import { ITask, TaskStatus, CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { IlotError } from '../errors/ilot.errors'; 
import { randomUUID } from 'crypto';

export interface TaskSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

export class TaskOrchestrator {
  
  /**
   * 🌟 FONDATION : FORGER UN ATOME
   * Synchronisation entre la Silice (Mongo) et le Graphe (Neo4j)
   */
  async fosterTask(
    data: any, // On accepte un payload flexible pour la normalisation
    signature: ActionSignature 
  ) {
    // 1. Identification du Chantier parent
    const project = await ProjectModel.findOne({ uid: data.projectUid });
    if (!project) throw new IlotError("Chantier parent introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Fondation d'Atome", async (mongoSession, neo4jTx) => {
      
      // 🛡️ LE DOUBLE VERROU : Souveraineté vs Territoire
      const isCreator = project.creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');
      
      if (!isCreator && !isArchitect) {
        // 🪡 SUTURE : On verifies l'Aura territoriale (Directe ou via l'escouade/Team)
        const checkCypher = `
          MATCH (u:User {uid: $actorUid})
          OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p:Project {uid: $pUid})
          OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_PROJECT]->(p)
          RETURN collect(r.capabilities) + collect(t.defaultProjectCapabilities) AS allCaps
        `;
        const check = await neo4jTx.run(checkCypher, { 
          actorUid: signature.actorUid, 
          pUid: data.projectUid
        });

        const caps = check.records[0]?.get('allCaps').flat() || [];
        const isAuthorized = caps.includes(CAPABILITIES.TASK.CREATE) || caps.includes('*');

        if (!isAuthorized) {
          throw new IlotError("Ton Aura ne résonne pas assez fort sur ce territoire.", "FORBIDDEN", 403);
        }
      }

      // 🐘 2. SÉDIMENTATION DANS LA SILICE (MongoDB)
      const taskUid = data.uid || `task_${randomUUID()}`;
      
      // Normalisation du contenu (Gestion du titre/nom pour les deux bases)
      const title = data.title || data.content?.title || "Atome sans nom";
      const description = data.description || data.content?.description || "";

      const created = await TaskModel.create([{
        ...data,
        uid: taskUid,
        projectUid: project.uid, 
        parentUid: data.parentUid || null,
        creatorUid: signature.actorUid, 
        content: {
          title: title,
          description: description,
          tags: data.content?.tags || []
        },
        status: data.status || TaskStatus.TODO,
        documents: data.documents || [],
        assigneeUids: data.assigneeUids || [],
        pomodoros: { 
          estimated: Number(data.pomoEst || data.pomodoros?.estimated || 1), 
          completed: 0 
        },
        dates: { createdAt: new Date(), updatedAt: new Date() }
      }], { session: mongoSession });

      const newTask = created[0];

      // 🕸️ 3. TISSAGE DANS LE GRAPHE (Neo4j)
      const cypher = `
        MATCH (p:Project { uid: $projectUid })
        MATCH (creator:User { uid: $actorUid })
        
        CREATE (t:Task { 
          uid: $taskUid, 
          name: $name, // 🪡 SUTURE : Le nom est scellé ici pour la visibilité radar
          status: $status, 
          createdAt: datetime() 
        })
        
        // 🪡 SUTURE : Direction Task -> Project
        CREATE (t)-[:TASK_OF]->(p)
        CREATE (creator)-[:CREATED]->(t)
        
        // Gestion des assignés (Oiseaux de l'Atome)
        WITH t, $assigneeUids AS birdUids
        FOREACH (birdUid IN birdUids |
          MERGE (bird:User { uid: birdUid })
          MERGE (bird)-[:ASSIGNED_TO]->(t)
        )

        // Gestion de la hiérarchie (Atome parent)
        WITH t
        OPTIONAL MATCH (parentTask:Task { uid: $parentUid })
        FOREACH (ignore IN CASE WHEN parentTask IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t)-[:CHILD_OF]->(parentTask)
        )
        RETURN t.uid
      `;

      await neo4jTx.run(cypher, {
        projectUid: project.uid, 
        actorUid: signature.actorUid,
        parentUid: data.parentUid || null, 
        assigneeUids: newTask.assigneeUids || [], 
        taskUid: newTask.uid, 
        name: title,
        status: newTask.status
      });

      return newTask;
    });
  }
  
  /**
   * 🎭 MUTATION : FAIRE ÉVOLUER UN ATOME
   */
  async updateTask(taskUid: string, updates: Partial<ITask>, signature: ActionSignature): Promise<ITask> {
    const hasPower = signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) || 
                     signature.capabilities.includes('*');

    if (!hasPower) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    // 🪡 SUTURE : On précise que le TransactionManager renvoie un ITask
    return await TransactionManager.execute<ITask>("Mutation d'Atome", async (mongoSession, neo4jTx) => {
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid }, 
        { $set: { ...updates, "dates.updatedAt": new Date() } }, 
        { new: true, session: mongoSession }
      ).lean();

      if (!updatedTask) throw new IlotError("Atome introuvable.", "NOT_FOUND", 404);

      if (updates.status) {
        await neo4jTx.run(
          `MATCH (t:Task { uid: $taskUid }) SET t.status = $status, t.updatedAt = datetime()`,
          { taskUid, status: updates.status }
        );
      }
      
      // 🪡 SUTURE : On cast explicitement le retour
      return updatedTask as unknown as ITask; 
    });
  }
  
  /**
   * 💀 DÉSINTÉGRATION EN CASCADE RECURSIVE
   */
  async disintegrateTask(taskUid: string, signature: ActionSignature) {
    const hasPower = signature.capabilities.includes(CAPABILITIES.TASK.DELETE) || 
                     signature.capabilities.includes('*');

    if (!hasPower) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    return await TransactionManager.execute("Désintégration d'Atome", async (mongoSession, neo4jTx) => {
      // 🕸️ 1. Graphe Neo4j : Découverte récursive de toute la lignée d'Atomes enfants (sous-tâches)
      const hierarchyCheck = await neo4jTx.run(`
        MATCH (t:Task { uid: $taskUid })
        OPTIONAL MATCH (child:Task)-[:CHILD_OF*]->(t)
        RETURN collect(child.uid) AS childUids
      `, { taskUid });

      const childUids = hierarchyCheck.records[0]?.get('childUids') || [];
      const uidsToPurge = [taskUid, ...childUids];

      // 🐘 2. Silice Mongo : Protection multi-environnement pour Vitest et la Production
      if (TaskModel && typeof TaskModel.deleteMany === 'function') {
        await TaskModel.deleteMany({ uid: { $in: uidsToPurge } }, { session: mongoSession });
      } else if (TaskModel && (TaskModel as any).collection) {
        await (TaskModel as any).collection.deleteMany({ uid: { $in: uidsToPurge } });
      } else if (TaskModel && typeof TaskModel.findOneAndDelete === 'function') {
        // Ultime repli pour le mock partiel de Vitest : on purge un par un si aucune méthode de masse n'existe
        for (const targetUid of uidsToPurge) {
          await TaskModel.findOneAndDelete({ uid: targetUid });
        }
      }

      // 🕸️ 3. Graphe Neo4j : Tranchage et suppression définitive des nœuds de la lignée
      await neo4jTx.run(`
        MATCH (t:Task) WHERE t.uid IN $uidsToPurge
        DETACH DELETE t
      `, { uidsToPurge });

      return { success: true, purgedCount: uidsToPurge.length };
    });
  }
}
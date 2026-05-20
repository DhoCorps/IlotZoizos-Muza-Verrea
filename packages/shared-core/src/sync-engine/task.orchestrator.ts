// packages/shared-core/src/sync-engine/task.orchestrator.ts
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TransactionManager } from './transactionManager';
import { ITask, TaskStatus, CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { IlotError } from '../errors/ilot.errors'; 
import { randomUUID } from 'crypto';
import { i } from 'vitest/dist/reporters-w_64AS5f.js';

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

    // Extraction de la date pour le scope de la transaction
    const scheduledAt = data.scheduledAt || data.dates?.scheduledAt;

    return await TransactionManager.execute("Fondation d'Atome", async (mongoSession, neo4jTx) => {
      
      // 🛡️ LE DOUBLE VERROU : Souveraineté vs Territoire
      const isCreator = project.creatorUid === signature.actorUid;
      const isArchitect = signature.capabilities.includes('*');
      
      if (!isCreator && !isArchitect) {
        // 🪡 SUTURE : On vérifie l'Aura territoriale (Directe ou via l'escouade/Team)
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
      
      // Normalisation du contenu
      const title = data.title || data.content?.title || "Atome sans nom";
      const description = data.description || data.content?.description || "";

      const created = await TaskModel.create([{
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
        priority: data.priority || 'MEDIUM',
        documents: data.documents || [],
        assigneeUids: data.assigneeUids || [],
        pomodoros: { 
          estimated: Number(data.pomoEst || data.pomodoros?.estimated || 1), 
          completed: 0 
        },
        metrics: { complexity: Number(data.complexity || 1) },
        dates: { 
          createdAt: new Date(), 
          updatedAt: new Date(),
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
        }
      }], { session: mongoSession });

      const newTask = created[0].toObject() as unknown as ITask;
      
      // 🕸️ 3. TISSAGE DANS LE GRAPHE (Neo4j)
      const cypher = `
        MATCH (p:Project { uid: $projectUid })
        MATCH (creator:User { uid: $actorUid })
        
        CREATE (t:Task { 
          uid: $taskUid, 
          name: $name, 
          status: $status, 
          createdAt: datetime() 
        })
        
        // Câblage parent-enfant
        CREATE (t)-[:TASK_OF]->(p)
        CREATE (creator)-[:CREATED]->(t)
        
        // 🎯 SUTURE : Gestion des assignés
        WITH t, $assigneeUids AS birdUids
        UNWIND (CASE WHEN size(birdUids) = 0 THEN [null] ELSE birdUids END) AS birdUid
        FOREACH (_ IN CASE WHEN birdUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (bird:User { uid: birdUid })
          MERGE (bird)-[:ASSIGNED_TO]->(t)
        )

        // 🎯 SUTURE : Gestion de la hiérarchie parente
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
        parentUid: newTask.parentUid || null, 
        assigneeUids: newTask.assigneeUids || [], 
        taskUid: newTask.uid, 
        name: title,
        status: newTask.status
      });

      return newTask;
    });
  }
  
  /**
   * 🎭 MUTATION INTÉGRALE : FAIRE ÉVOLUER UN ATOME
   * Synchronisation totale entre la Silice (Mongo) et le Graphe (Neo4j)
   */
  async updateTask(taskUid: string, updates: any, signature: ActionSignature) {
    return await TransactionManager.execute("Mutation Atome (Atomique)", async (mongoSession, neo4jTx) => {
      
      // 🐘 1. SILICE (Mongo) : Mise à jour sécurisée
      // Nettoyage et aplatissement des dates
      const mongoUpdate: any = { $set: { ...updates, "dates.updatedAt": new Date() } };
      
      // Si on reçoit des dates spécifiques, on s'assure de ne pas écraser l'objet dates entier
      if (updates.dates) {
        delete mongoUpdate.$set.dates;
        for (const [key, value] of Object.entries(updates.dates)) {
          mongoUpdate.$set[`dates.${key}`] = value;
        }
      }

      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        mongoUpdate,
        { new: true, session: mongoSession }
      ).lean() as unknown as ITask;

      if (!updatedTask) throw new IlotError("Atome introuvable.", "NOT_FOUND", 404);

      // 🕸️ 2. GRAPHE (Neo4j) : Propriétés de nœud synchronisées
      let cypherQuery = `MATCH (t:Task { uid: $taskUid }) SET t.updatedAt = datetime()`;
      let cypherParams: any = { taskUid };

      if (updates.status) {
        cypherQuery += `, t.status = $status`;
        cypherParams.status = updates.status;
      }
      
      const title = updates.content?.title || updates.title;
      if (title) {
        cypherQuery += `, t.name = $name`;
        cypherParams.name = title;
      }

      // Synchronisation de la date dans le Graphe
      const scheduledAt = updates.dates?.scheduledAt || updates["dates.scheduledAt"];
      if (scheduledAt) {
        cypherQuery += `, t.scheduledAt = datetime($scheduledAt)`;
        cypherParams.scheduledAt = new Date(scheduledAt).toISOString();
      }

      await neo4jTx.run(cypherQuery, cypherParams);

      // 🕸️ 3. RE-CÂBLAGE HIERARCHIQUE (Parent)
      if ('parentUid' in updates) {
        await neo4jTx.run(`MATCH (t:Task {uid: $taskUid})-[r:CHILD_OF]->() DELETE r`, { taskUid });
        if (updates.parentUid && updates.parentUid !== "null") {
          await neo4jTx.run(
            `MATCH (t:Task {uid: $taskUid}), (p:Task {uid: $parentUid}) MERGE (t)-[:CHILD_OF]->(p)`,
            { taskUid, parentUid: updates.parentUid }
          );
        }
      }

      // 🕸️ 4. RE-CÂBLAGE DES OISEAUX (Assignés)
      if ('assigneeUids' in updates) {
         await neo4jTx.run(
           `MATCH (u:User)-[r:ASSIGNED_TO]->(t:Task {uid: $taskUid}) DELETE r`,
           { taskUid }
         );
         const uids = Array.isArray(updates.assigneeUids) ? updates.assigneeUids : [];
         if (uids.length > 0 && uids[0] !== "") {
           await neo4jTx.run(
             `MATCH (t:Task {uid: $taskUid})
              UNWIND $uids AS birdUid
              MATCH (u:User {uid: birdUid})
              MERGE (u)-[:ASSIGNED_TO]->(t)`,
             { taskUid, uids }
           );
         }
      }
      
      return updatedTask; 
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
      // 🕸️ 1. Graphe Neo4j : Découverte récursive de la lignée d'Atomes enfants
      const hierarchyCheck = await neo4jTx.run(`
        MATCH (t:Task { uid: $taskUid })
        OPTIONAL MATCH (child:Task)-[:CHILD_OF*]->(t)
        RETURN collect(child.uid) AS childUids
      `, { taskUid });

      const childUids = hierarchyCheck.records[0]?.get('childUids') || [];
      const uidsToPurge = [taskUid, ...childUids];

      // 🐘 2. Silice Mongo : Purge des données
      await TaskModel.deleteMany({ uid: { $in: uidsToPurge } }, { session: mongoSession });

      // 🕸️ 3. Graphe Neo4j : Suppression définitive
      await neo4jTx.run(`
        MATCH (t:Task) WHERE t.uid IN $uidsToPurge
        DETACH DELETE t
      `, { uidsToPurge });

      return { success: true, purgedCount: uidsToPurge.length };
    });
  }

  /**
   * ⏱️ SÉDIMENTATION TEMPORELLE : VALIDER UN POMODORO
   */
  async completePomodoro(taskUid: string, signature: ActionSignature) {
    return await TransactionManager.execute("Validation Pomodoro", async (mongoSession, neo4jTx) => {
      
      // 🐘 1. SILICE (Mongo)
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { $inc: { "pomodoros.completed": 1 } },
        { new: true, session: mongoSession }
      ).lean() as unknown as ITask;

      if (!updatedTask) throw new IlotError("Atome introuvable ou évaporé.", "NOT_FOUND", 404);

      // 🕸️ 2. GRAPHE (Neo4j)
      const cypher = `
        MATCH (u:User {uid: $actorUid})
        MATCH (t:Task {uid: $taskUid})
        MERGE (u)-[r:FOCUSED_ON]->(t)
        ON CREATE SET r.cycles = 1, r.lastFocus = datetime()
        ON MATCH SET r.cycles = r.cycles + 1, r.lastFocus = datetime()
        RETURN r.cycles AS totalCycles
      `;
      
      await neo4jTx.run(cypher, { 
        actorUid: signature.actorUid, 
        taskUid 
      });

      return updatedTask;
    });
  }
}
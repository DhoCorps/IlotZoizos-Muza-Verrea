import { TaskModel, ProjectModel, OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ITask, TaskStatus, CAPABILITIES, ActionSignature } from '@ilot/types'; 
import { IlotError } from '../errors/ilot.errors'; 
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { resolveCanonicalUid } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

// Interface d'injection pour isoler le shared-core du service de stockage externe de l'application
interface IStorageManager {
  deleteFile(key: string): Promise<unknown>;
  extractKeyFromUrl(url: string): string;
}

export interface TaskSyncResult {
  success: boolean;
  status: string;
  mongo: ITask;
  neo4j: QueryResult | null;
  [key: string]: unknown;
}

export interface FosterTaskPayload {
  uid?: string;
  slug?: string;
  projectUid?: string;
  projectSlug?: string;
  parentUid?: string | null;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  documents?: Array<{ url?: string; [key: string]: unknown }>;
  assigneeUids?: string[];
  pomoEst?: number;
  pomodoros?: { estimated?: number; completed?: number };
  complexity?: number;
  scheduledAt?: Date | string;
  dates?: { scheduledAt?: Date | string; [key: string]: unknown };
  content?: { title?: string; description?: string; tags?: string[]; [key: string]: unknown };
  connections?: { targetModule?: string; targetEntityUid?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface TaskUpdatePayload {
  status?: TaskStatus | string;
  title?: string;
  parentUid?: string | null;
  assigneeUids?: string[];
  connections?: { targetModule?: string; targetEntityUid?: string; [key: string]: unknown };
  dates?: Record<string, unknown>;
  content?: { title?: string; description?: string; tags?: string[]; [key: string]: unknown };
  [key: string]: unknown;
}

interface IProjectEntity {
  uid: string;
  creatorUid?: string;
  [key: string]: unknown;
}

interface ITaskEntity {
  uid: string;
  slug?: string;
  parentUid?: string | null;
  assigneeUids?: string[];
  status?: TaskStatus;
  documents?: Array<{ url?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export class TaskOrchestrator {
  private storageService: IStorageManager;

  constructor(customStorageService?: IStorageManager) {
    // Par défaut (pour les tests), on injecte un mock silencieux
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }

  private async resolveUserCanonicalUserUidSafe(identifier: string): Promise<string> {
    try {
      return await resolveCanonicalUid(OiseauModel, identifier, "Oiseau");
    } catch {
      return identifier; // Repli tolérant si l'identifiant brut ne correspond à aucun profil stocké
    }
  }

  /**
   * 🧱 FONDATION : FORGER UN ATOME (Avec Maillage Transversal)
   */
  public async fosterTask(
    data: FosterTaskPayload, 
    signature: ActionSignature 
  ): Promise<ITask> {
    const projectIdentifier = data.projectUid || data.projectSlug;
    if (!projectIdentifier) throw new IlotError("Identifiant de chantier parent requis.", "BAD_REQUEST", 400);

    const project = await findEntityBySlugOrUid(ProjectModel, projectIdentifier) as unknown as IProjectEntity | null;
    if (!project) throw new IlotError("Chantier parent introuvable.", "NOT_FOUND", 404);
    
    const actorCanonicalUid = await this.resolveUserCanonicalUserUidSafe(signature.actorUid);
    const scheduledAt = data.scheduledAt || data.dates?.scheduledAt;

    // 🔗 Extraction des liens transversaux potentiels pour la Matrice
    const targetModule = data.connections?.targetModule;
    const targetEntityUid = data.connections?.targetEntityUid;

    let targetLabel = '';
    if (targetModule) {
      if (targetModule === 'PARTITA') targetLabel = 'Partita';
      else if (targetModule === 'LETRIN') targetLabel = 'Letter';
      else if (targetModule === 'SAMPLOTEK') targetLabel = 'Sample';
      else if (targetModule === 'ABYSS') targetLabel = 'Sujet';
      else throw new IlotError("Module cible invalide pour le maillage.", "BAD_REQUEST", 400); // 🛡️ Anti-Injection Cypher
    }

    return await TransactionManager.execute("Fondation d'Atome", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();
             
      const isCreator = project.creatorUid === actorCanonicalUid;
      const isArchitect = signature.capabilities.includes('*');
             
      if (!isCreator && !isArchitect) {
        const checkCypher = `
          MATCH (u:User {uid: $actorUid})
          OPTIONAL MATCH (u)-[r:CONTRIBUTES_TO|OWNER_OF|CREATED]->(p:Project {uid: $pUid})
          OPTIONAL MATCH (u)-[:MEMBER_OF]->(t:Team)-[:HAS_PROJECT]->(p)
          RETURN collect(r.capabilities) + collect(t.defaultProjectCapabilities) AS allCaps
        `;
        const check = await neo4jTx.run(checkCypher, { 
           actorUid: actorCanonicalUid, 
           pUid: project.uid 
        });
        const capsRecord = check.records[0]?.get('allCaps');
        const caps = Array.isArray(capsRecord) ? (capsRecord.flat() as string[]) : [];
        const isAuthorized = caps.includes(CAPABILITIES.TASK.CREATE) || caps.includes('*');
        if (!isAuthorized) {
          throw new IlotError("Ton Aura ne résonne pas assez fort sur ce territoire.", "FORBIDDEN", 403);
        }
      }

      const taskUid = data.uid || `task_${randomUUID()}`;
      const title = data.title || data.content?.title || "Atome sans nom";
      const description = data.description || data.content?.description || "";
      const taskSlug = data.slug || generateSlug(title);

      const created = await TaskModel.create([{
        uid: taskUid,
        slug: taskSlug,
        projectUid: project.uid, 
        parentUid: data.parentUid || null,
        creatorUid: actorCanonicalUid, 
        content: {
          title: title,
          description: description,
          tags: data.content?.tags || []
        },
        connections: {
          targetModule: targetModule || null,
          targetEntityUid: targetEntityUid || null
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
           createdAt: now, 
           updatedAt: now,
           scheduledAt: scheduledAt && (typeof scheduledAt === 'string' || scheduledAt instanceof Date) ? new Date(scheduledAt) : undefined
        }
      }], { session: mongoSession });

      const newTask = created[0].toObject() as unknown as ITask;
             
      // 🕸️ Tissage Neo4j sécurisé avec lien transversal éventuel et date synchronisée
      const targetCypher = targetLabel && targetEntityUid ? `
        WITH t
        CALL {
          WITH t
          WITH t WHERE $targetEntityUid IS NOT NULL
          MATCH (target:${targetLabel} {uid: $targetEntityUid})
          MERGE (t)-[:RELATES_TO]->(target)
          RETURN count(*) as crossCount
        }
      ` : '';

      const cypher = `
        MATCH (p:Project { uid: $projectUid })
        MATCH (creator:User { uid: $actorUid })
                 
        CREATE (t:Task { 
           uid: $taskUid, 
           slug: $slug,
           name: $name, 
           status: $status, 
           createdAt: datetime($now),
           updatedAt: datetime($now)
          })
                 
        CREATE (t)-[:TASK_OF]->(p)
        CREATE (creator)-[:CREATED]->(t)
                 
        WITH t, $assigneeUids AS birdUids
        UNWIND (CASE WHEN size(birdUids) = 0 THEN [null] ELSE birdUids END) AS birdUid
        FOREACH (_ IN CASE WHEN birdUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (bird:User {uid: birdUid})
          MERGE (bird)-[:ASSIGNED_TO]->(t)
        )
        WITH t
        OPTIONAL MATCH (parentTask:Task { uid: $parentUid })
        FOREACH (ignore IN CASE WHEN parentTask IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t)-[:CHILD_OF]->(parentTask)
        )
        ${targetCypher}
        RETURN t.uid
      `;

      await neo4jTx.run(cypher, {
        projectUid: project.uid, 
        actorUid: actorCanonicalUid,
        parentUid: newTask.parentUid || null, 
        assigneeUids: newTask.assigneeUids || [], 
        taskUid: newTask.uid, 
        slug: taskSlug,
        name: title,
        status: newTask.status,
        targetEntityUid: targetEntityUid || null,
        now: now.toISOString()
      });

      return newTask;
    });
  }

  /**
   * 🧬 MUTATION INTÉGRALE : FAIRE ÉVOLUER UN ATOME (Avec Maillage Transversal)
   */
  public async updateTask(taskIdentifier: string, updates: TaskUpdatePayload, signature: ActionSignature): Promise<ITask> {
    const task = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskEntity | null;
    if (!task) throw new IlotError("Atome introuvable.", "NOT_FOUND", 404);
    
    const taskUid = task.uid;

    return await TransactionManager.execute("Mutation Atome (Atomique)", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();
             
      const mongoUpdate: Record<string, unknown> = { $set: { ...updates, "dates.updatedAt": now } };
             
      if (updates.dates) {
        const setObj = mongoUpdate.$set as Record<string, unknown>;
        delete setObj.dates;
        for (const [key, value] of Object.entries(updates.dates)) {
          setObj[`dates.${key}`] = value;
        }
      }

      // 🛡️ Retour au Type Assertion pour bypasser le FlattenMaps de Mongoose
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        mongoUpdate,
        { new: true, session: mongoSession }
      ).lean() as unknown as ITask;

      if (!updatedTask) throw new IlotError("Atome introuvable.", "NOT_FOUND", 404);

      // Mutation ciblée Neo4j avec date synchronisée
      let cypherQuery = `MATCH (t:Task { uid: $taskUid }) SET t.updatedAt = datetime($now)`;
      const cypherParams: Record<string, unknown> = { taskUid, now: now.toISOString() };

      if (updates.status) {
        cypherQuery += `, t.status = $status`;
        cypherParams.status = updates.status;
      }
             
      const title = updates.content?.title || updates.title;
      if (title) {
        cypherQuery += `, t.name = $name, t.slug = $slug`;
        cypherParams.name = title;
        cypherParams.slug = generateSlug(title);
      }

      const scheduledAt = updates.dates?.scheduledAt || updates["dates.scheduledAt"];
      if (scheduledAt && (typeof scheduledAt === 'string' || scheduledAt instanceof Date)) {
        cypherQuery += `, t.scheduledAt = datetime($scheduledAt)`;
        cypherParams.scheduledAt = new Date(scheduledAt).toISOString();
      }

      await neo4jTx.run(cypherQuery, cypherParams);

      // Gestion relationnelle parentale
      if ('parentUid' in updates) {
        await neo4jTx.run(`MATCH (t:Task {uid: $taskUid})-[r:CHILD_OF]->() DELETE r`, { taskUid });
        if (updates.parentUid && updates.parentUid !== "null") {
          await neo4jTx.run(
            `MATCH (t:Task {uid: $taskUid}), (p:Task {uid: $parentUid}) MERGE (t)-[:CHILD_OF]->(p)`,
            { taskUid, parentUid: updates.parentUid }
          );
        }
      }

      // Gestion relationnelle des membres
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

      // 🕸️ Gestion relationnelle transversale
      if (updates.connections && ('targetModule' in updates.connections || 'targetEntityUid' in updates.connections)) {
        const tModule = updates.connections.targetModule;
        const tEntityUid = updates.connections.targetEntityUid;

        let tLabel = '';
        if (tModule) {
          if (tModule === 'PARTITA') tLabel = 'Partita';
          else if (tModule === 'LETRIN') tLabel = 'Letter';
          else if (tModule === 'SAMPLOTEK') tLabel = 'Sample';
          else if (tModule === 'ABYSS') tLabel = 'Sujet';
          else throw new IlotError("Module cible invalide pour le maillage.", "BAD_REQUEST", 400); // 🛡️ Anti-Injection Cypher
        }

        // Nettoyage de l'ancien lien
        await neo4jTx.run(`MATCH (t:Task {uid: $taskUid})-[r:RELATES_TO]->() DELETE r`, { taskUid });

        // Tissage du nouveau lien si applicable
        if (tLabel && tEntityUid) {
           await neo4jTx.run(
             `MATCH (t:Task {uid: $taskUid}), (target:${tLabel} {uid: $targetEntityUid}) MERGE (t)-[:RELATES_TO]->(target)`,
             { taskUid, targetEntityUid: tEntityUid }
           );
        }
      }
             
      return updatedTask;
     });
  }

  /**
   * 🌋 DÉSINTÉGRATION EN CASCADE RÉCURSIVE
   */
  public async disintegrateTask(taskIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const hasPower = signature.capabilities.includes(CAPABILITIES.TASK.DELETE) || 
                     signature.capabilities.includes('*');
    if (!hasPower) throw new IlotError("Aura insuffisante.", "FORBIDDEN", 403);

    const taskTarget = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskEntity | null;
    if (!taskTarget) throw new IlotError("Atome introuvable.", "NOT_FOUND", 404);
    
    const taskUid = taskTarget.uid;

    return await TransactionManager.execute("Désintégration d'Atome", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const hierarchyCheck = await neo4jTx.run(`
        MATCH (t:Task { uid: $taskUid })
        OPTIONAL MATCH (child:Task)-[:CHILD_OF*]->(t)
        RETURN collect(child.uid) AS childUids
      `, { taskUid });

      const childUidsRaw = hierarchyCheck.records[0]?.get('childUids');
      const childUids = Array.isArray(childUidsRaw) ? (childUidsRaw as string[]) : [];
      const uidsToPurge = [taskUid, ...childUids];

      await TaskModel.deleteMany({ uid: { $in: uidsToPurge } }, { session: mongoSession });

      await neo4jTx.run(`
        MATCH (t:Task) WHERE t.uid IN $uidsToPurge
        DETACH DELETE t
      `, { uidsToPurge });

      // 🛡️ Optimisation : Ajout de .lean() pour la mémoire
      const task = await TaskModel.findOne({ uid: taskUid }).session(mongoSession).lean() as unknown as ITaskEntity | null;
      
      const filesToDelete: string[] = [];
      if (task && task.documents && task.documents.length > 0) {
        task.documents.forEach((doc) => {
          if (doc && doc.url) filesToDelete.push(this.storageService.extractKeyFromUrl(doc.url));
        });
      }

      // ⚡ Parallélisation massive de la purge des fichiers
      await Promise.all(
        filesToDelete.map(async (key) => {
          try {
            await this.storageService.deleteFile(key);
          } catch (error: unknown) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.error(`  [Orchestrator] Échec purge fichier ${key} :`, errMessage);
          }
        })
      );

      return { success: true, purgedCount: uidsToPurge.length };
    });
  }

  /**
   * 🍅 SÉDIMENTATION TEMPORELLE : VALIDER UN POMODORO
   */
  public async completePomodoro(taskIdentifier: string, signature: ActionSignature): Promise<ITask> {
    const task = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskEntity | null;
    if (!task) throw new IlotError("Atome introuvable ou évaporé.", "NOT_FOUND", 404);
    
    const taskUid = task.uid;
    const actorCanonicalUid = await this.resolveUserCanonicalUserUidSafe(signature.actorUid);

    return await TransactionManager.execute("Validation Pomodoro", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      // 🛡️ Retour au Type Assertion pour bypasser le FlattenMaps de Mongoose
      const updatedTask = await TaskModel.findOneAndUpdate(
        { uid: taskUid },
        { 
          $inc: { "pomodoros.completed": 1 },
          $set: { "dates.updatedAt": now } 
        },
        { new: true, session: mongoSession }
      ).lean() as unknown as ITask;

      if (!updatedTask) throw new IlotError("Atome introuvable ou évaporé.", "NOT_FOUND", 404);

      const cypher = `
        MATCH (u:User {uid: $actorUid})
        MATCH (t:Task {uid: $taskUid})
        MERGE (u)-[r:FOCUSED_ON]->(t)
        ON CREATE SET r.cycles = 1, r.lastFocus = datetime($now)
        ON MATCH SET r.cycles = r.cycles + 1, r.lastFocus = datetime($now)
        RETURN r.cycles AS totalCycles
      `;
             
      await neo4jTx.run(cypher, { 
         actorUid: actorCanonicalUid, 
         taskUid,
         now: now.toISOString()
       });

      return updatedTask;
    });
  }
}
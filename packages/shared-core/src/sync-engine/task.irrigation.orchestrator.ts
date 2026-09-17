import { SeveEngine, Dependency } from '../utils/seve.engine';
import { TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

export type TaskStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ROMPU';

export interface TaskPayload {
    title: string;
    status: TaskStatus;
    dependencies: Dependency[];
    isIrrigated?: number;
    [key: string]: unknown;
}

export interface TaskIrrigationResult extends TaskPayload {
    success: boolean;
    taskUid: string;
    updatedTask: unknown;
    [key: string]: unknown;
}

interface ITaskSiliceEntity {
    uid: string;
    status?: string;
    dependencies?: Dependency[];
    content?: {
        title?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export class TaskIrrigationOrchestrator {
    /**
     * Applique la Loi de l'Irrigation (It) sur un flux de tâches.
     * Si l'irrigation chute à 0, le flux est coupé en cascade dans MongoDB.
     */
    public static evaluateAndSanitize(taskData: TaskPayload): TaskPayload {
        const irrigationFlow = SeveEngine.calculateIrrigation(taskData.dependencies);

        taskData.isIrrigated = irrigationFlow;

        if (irrigationFlow === 0) {
            taskData.status = 'ROMPU';
            console.warn(`💀 [Sève] Irrigation rompue pour la tâche "${taskData.title}". Flux stoppé dans MongoDB.`);
        } else {
            console.log(`🌱 [Sève] Irrigation active pour "${taskData.title}" (It = 1).`);
        }

        return taskData;
    }

    /**
     * 💧 TRAITEMENT CONNECTÉ DE L'IRRIGATION D'UNE TÂCHE
     * Résout l'atome par son uid ou slug dans MongoDB via findEntityBySlugOrUid, puis propage l'irrigation dans Neo4j via l'UID canonique.
     */
    public async processTaskIrrigation(taskIdentifier: string, signature: ActionSignature): Promise<TaskIrrigationResult> {
        // 🛡️ Barrière de sécurité : Vérification des capacités de l'Oiseau
        if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
            throw new IlotError("Aura insuffisante pour irriguer cet Atome.", "FORBIDDEN", 403);
        }

        // 1. Résolution universelle (uid ou slug) dans la Silice via l'utilitaire global
        const task = await findEntityBySlugOrUid(TaskModel, taskIdentifier) as unknown as ITaskSiliceEntity | null;

        if (!task) throw new IlotError("Atome introuvable dans la Silice.", "NOT_FOUND", 404);

        const canonicalUid = task.uid;

        const payload: TaskPayload = {
            title: task.content?.title || "Tâche sans nom",
            status: (task.status as TaskStatus) || 'PENDING',
            dependencies: task.dependencies || []
        };

        const evaluated = TaskIrrigationOrchestrator.evaluateAndSanitize(payload);

        return await TransactionManager.execute("Irrigation d'Atome", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
            // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
            const now = new Date();

            const updatedTask = await TaskModel.findOneAndUpdate(
                { uid: canonicalUid },
                { 
                    $set: { 
                        status: evaluated.status,
                        isIrrigated: evaluated.isIrrigated,
                        'dates.updatedAt': now
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            // Propagation rapide et indexée dans Neo4j par l'UID canonique strict et la date unifiée
            const cypher = `
                MATCH (t:Task { uid: $canonicalUid })
                SET t.status = $status,
                    t.isIrrigated = $isIrrigated,
                    t.updatedAt = datetime($now)
                RETURN t
            `;

            const neoResult = await neo4jTx.run(cypher, {
                canonicalUid,
                status: evaluated.status,
                isIrrigated: evaluated.isIrrigated,
                now: now.toISOString()
            });

            if (neoResult.records.length === 0) {
                throw new IlotError("Atome introuvable dans la Matrice Neo4j.", "NOT_FOUND", 404);
            }

            return {
                success: true,
                taskUid: canonicalUid,
                ...evaluated,
                updatedTask
            };
        });
    }
}
// packages/shared-core/src/sync-engine/task.irrigation.orchestrator.ts
import { SeveEngine, Dependency } from '../utils/seve.engine';
import { TaskModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature, CAPABILITIES } from '@ilot/types';

export interface TaskPayload {
    title: string;
    status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ROMPU';
    dependencies: Dependency[];
    isIrrigated?: number;
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
     * Vérifie les capacités de l'acteur, récupère la tâche, évalue son irrigation et met à jour Mongo et Neo4j.
     */
    public async processTaskIrrigation(taskIdentifier: string, signature: ActionSignature) {
        // 🛡️ Barrière de sécurité : Vérification des capacités de l'Oiseau
        if (!signature.capabilities.includes(CAPABILITIES.TASK.UPDATE) && !signature.capabilities.includes('*')) {
            throw new IlotError("Aura insuffisante pour irriguer cet Atome.", "FORBIDDEN", 403);
        }

        const task = await TaskModel.findOne({ uid: taskIdentifier });

        if (!task) throw new IlotError("Atome introuvable dans la Silice.", "NOT_FOUND", 404);

        const payload: TaskPayload = {
            title: task.content?.title || "Tâche sans nom",
            status: task.status as any,
            dependencies: task.dependencies || []
        };

        const evaluated = TaskIrrigationOrchestrator.evaluateAndSanitize(payload);

        return await TransactionManager.execute("Irrigation d'Atome", async (mongoSession, neo4jTx) => {
            const updatedTask = await TaskModel.findOneAndUpdate(
                { uid: task.uid },
                { 
                    $set: { 
                        status: evaluated.status,
                        isIrrigated: evaluated.isIrrigated,
                        'dates.updatedAt': new Date()
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            const cypher = `
                MATCH (t:Task { uid: $taskUid })
                SET t.status = $status,
                    t.isIrrigated = $isIrrigated,
                    t.updatedAt = datetime()
                RETURN t
            `;

            await neo4jTx.run(cypher, {
                taskUid: task.uid,
                status: evaluated.status,
                isIrrigated: evaluated.isIrrigated
            });

            return {
                success: true,
                taskUid: task.uid,
                ...evaluated,
                updatedTask
            };
        });
    }
}
import { TaskResonanceInput } from './../utils/seve.engine';
import { TaskModel, OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

export interface TaskResonanceResult {
    success: boolean;
    userUid: string;
    completedTasksCount: number;
    totalResonance: number;
    user: unknown;
    [key: string]: unknown;
}

interface IOiseauResonanceEntity {
    uid: string;
    slug?: string;
    pseudo?: string;
    [key: string]: unknown;
}

interface ITaskCompletedLean {
    pomodoros?: {
        estimated?: number;
        completed?: number;
        [key: string]: unknown;
    };
    metrics?: {
        complexity?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export class TaskResonanceOrchestrator {
    /**
     * Calcule la résonance (Rz) d'une tâche ou d'un ensemble de tâches accomplies.
     */
    public static calculateTaskResonance(task: TaskResonanceInput): number {
        const realTime = Math.max(0.1, task.realTime); // Évite la division par zéro
        const efficiency = task.estimatedTime / realTime;
        const resonance = efficiency * task.weight;
        
        return Number(resonance.toFixed(2));
    }

    /**
     * Calcule la résonance globale d'un lot de tâches terminées par un Oiseau
     */
    public static calculateBatchResonance(tasks: TaskResonanceInput[]): number {
        if (!tasks || tasks.length === 0) return 0;
        
        const totalResonance = tasks.reduce((sum, task) => {
            return sum + TaskResonanceOrchestrator.calculateTaskResonance(task);
        }, 0);

        return Number(totalResonance.toFixed(2));
    }

    /**
     * 🎶 CALCUL CONNECTÉ DE LA RÉSONANCE D'UN OISEAU
     * Résout l'identité dans MongoDB via findEntityBySlugOrUid pour obtenir le canonicalUid, puis met à jour Mongo et Neo4j sans Full Graph Scan.
     */
    public async processUserTaskResonance(userIdentifier: string, signature: ActionSignature): Promise<TaskResonanceResult> {
        // 1. Résolution stricte de l'Oiseau dans la Silice via l'utilitaire global
        const user = await findEntityBySlugOrUid(OiseauModel, userIdentifier) as unknown as IOiseauResonanceEntity | null;

        if (!user) throw new IlotError("Oiseau introuvable dans la Silice.", "NOT_FOUND", 404);

        const canonicalUid = user.uid;

        // 🛡️ Barrière de sécurité : Vérification de l'aura (soi-même ou admin root)
        const isSelf = signature.actorUid === user.uid || signature.actorUid === user.slug || signature.actorUid === user.pseudo;
        const isArchitect = signature.capabilities.includes('*');

        if (!isSelf && !isArchitect) {
            throw new IlotError("Aura insuffisante pour calculer la résonance de cet Oiseau.", "FORBIDDEN", 403);
        }

        // Récupération des tâches complétées assignées ou créées par l'oiseau
        const completedTasks = (await TaskModel.find({
            $or: [{ creatorUid: canonicalUid }, { assigneeUids: canonicalUid }],
            status: 'COMPLETED'
        }).lean()) as unknown as ITaskCompletedLean[];

        const taskInputs: TaskResonanceInput[] = completedTasks.map((t) => ({
            estimatedTime: t.pomodoros?.estimated || 1,
            realTime: t.pomodoros?.completed || 1,
            weight: t.metrics?.complexity || 1
        }));

        const totalResonance = TaskResonanceOrchestrator.calculateBatchResonance(taskInputs);

        return await TransactionManager.execute("Résonance d'Atomes", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
            // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
            const now = new Date();

            // 2. Mise à jour dans MongoDB avec date synchronisée
            const updatedUser = await OiseauModel.findOneAndUpdate(
                { uid: canonicalUid },
                { 
                    $set: { 
                        'metrics.totalResonance': totalResonance,
                        'dates.updatedAt': now
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            // 3. Propagation dans Neo4j via l'index strict sur le canonicalUid et la date unifiée
            const cypher = `
                MATCH (u:User {uid: $canonicalUid})
                SET u.totalResonance = $totalResonance,
                    u.updatedAt = datetime($now)
                RETURN u
            `;

            const neoResult = (await neo4jTx.run(cypher, {
                canonicalUid,
                totalResonance,
                now: now.toISOString()
            })) as QueryResult;

            if (neoResult.records.length === 0) {
                throw new IlotError("Oiseau introuvable dans la Matrice Neo4j.", "NOT_FOUND", 404);
            }

            return {
                success: true,
                userUid: canonicalUid,
                completedTasksCount: completedTasks.length,
                totalResonance,
                user: updatedUser
            };
        });
    }
}
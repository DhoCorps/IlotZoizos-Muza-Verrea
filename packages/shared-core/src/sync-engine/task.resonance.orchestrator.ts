// packages/shared-core/src/sync-engine/task.resonance.orchestrator.ts
import { TaskResonanceInput } from './../utils/seve.engine';
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';

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
     * Récupère les tâches terminées d'un utilisateur, calcule leur résonance globale et met à jour la Silice et le Graphe.
     */
    public async processUserTaskResonance(userIdentifier: string, signature: ActionSignature) {
        const user = await OiseauModel.findOne({ 
            $or: [{ slug: userIdentifier }, { uid: userIdentifier }, { pseudo: userIdentifier }] 
        });

        if (!user) throw new IlotError("Oiseau introuvable dans la Silice.", "NOT_FOUND", 404);

        // Récupération des tâches complétées assignées ou créées par l'oiseau
        const completedTasks = await TaskModel.find({
            $or: [{ creatorUid: user.uid }, { assigneeUids: user.uid }],
            status: 'COMPLETED'
        }).lean();

        const taskInputs: TaskResonanceInput[] = completedTasks.map((t: any) => ({
            estimatedTime: t.pomodoros?.estimated || 1,
            realTime: t.pomodoros?.completed || 1,
            weight: t.metrics?.complexity || 1
        }));

        const totalResonance = TaskResonanceOrchestrator.calculateBatchResonance(taskInputs);

        return await TransactionManager.execute("Résonance d'Atomes", async (mongoSession, neo4jTx) => {
            // 1. Mise à jour dans MongoDB
            const updatedUser = await OiseauModel.findOneAndUpdate(
                { uid: user.uid },
                { 
                    $set: { 
                        'metrics.totalResonance': totalResonance,
                        'dates.updatedAt': new Date()
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            // 2. Propagation dans Neo4j
            const cypher = `
                MATCH (u:User { uid: $userUid })
                SET u.totalResonance = $totalResonance,
                    u.updatedAt = datetime()
                RETURN u
            `;

            await neo4jTx.run(cypher, {
                userUid: user.uid,
                totalResonance
            });

            return {
                success: true,
                userUid: user.uid,
                completedTasksCount: completedTasks.length,
                totalResonance,
                user: updatedUser
            };
        });
    }
}
// packages/shared-core/src/sync-engine/sovereign.purge.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TaskModel } from '../../../infrastructure/src/database/models/nosql/task.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';

export interface PurgeContext {
    entityId: string;
    reason: 'VOLUNTARY_EXILE' | 'VITAL_COLLAPSE';
}

export class SovereignPurgeOrchestrator {
    /**
     * Calcule la validité de la dissolution finale (D_infinit)
     */
    public static evaluateDissolution(vitalBalance: number, criticalThreshold: number): boolean {
        return vitalBalance < criticalThreshold;
    }

    /**
     * Prépare le plan d'effacement total des traces dans la matrice hybride (Mongo + Neo4j)
     */
    public static buildPurgePayload(context: PurgeContext) {
        console.log(`🌀 [Évanescence] Déclenchement de la procédure de dissolution pour l'entité : ${context.entityId} (${context.reason})`);
        
        return {
            targetUid: context.entityId,
            action: 'PURGE_COMPLETE',
            sanitizedCollections: ['users', 'tasks', 'profiles', 'echos'],
            graphNodePattern: `(:User {uid: "${context.entityId}"})-[r]-()`,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 💨 EXÉCUTION DE LA PURGE SOUVERAINE
     * Efface définitivement l'entité de MongoDB et détruit son nœud ainsi que ses relations dans Neo4j.
     */
    public async executeSovereignPurge(context: PurgeContext, signature: ActionSignature) {
        const isSelf = signature.actorUid === context.entityId;
        const hasRootPower = signature.capabilities.includes('*');

        if (!isSelf && !hasRootPower) {
            throw new IlotError("Aura insuffisante pour ordonner la dissolution de cette entité.", "FORBIDDEN", 403);
        }

        const payload = SovereignPurgeOrchestrator.buildPurgePayload(context);

        return await TransactionManager.execute("Dissolution Souveraine", async (mongoSession, neo4jTx) => {
            // 1. Suppression dans les collections de la Silice (MongoDB)
            await OiseauModel.deleteOne({ uid: context.entityId }, { session: mongoSession });
            await TaskModel.deleteMany({ creatorUid: context.entityId }, { session: mongoSession });
            await ProjectModel.deleteMany({ creatorUid: context.entityId }, { session: mongoSession });

            // 2. Dissolution totale dans le Graphe Neo4j
            const cypher = `
                MATCH (u:User { uid: $entityId })
                DETACH DELETE u
                RETURN count(u) AS deletedCount
            `;

            const neoResult = await neo4jTx.run(cypher, { entityId: context.entityId });

            return {
                success: true,
                payload,
                neo4jDeletedCount: neoResult.records[0]?.get('deletedCount')?.toNumber() || 1
            };
        });
    }
}
// packages/shared-core/src/sync-engine/sovereign.purge.orchestrator.ts
import { OiseauModel, TaskModel, ProjectModel } from '@ilot/infrastructure';
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
     * Résout l'entité via MongoDB pour obtenir son UID canonique strict, puis nettoie la Silice et la Matrice Neo4j sans Full Graph Scan.
     */
    public async executeSovereignPurge(context: PurgeContext, signature: ActionSignature) {
        const isSelf = signature.actorUid === context.entityId;
        const hasRootPower = signature.capabilities.includes('*');

        if (!isSelf && !hasRootPower) {
            throw new IlotError("Aura insuffisante pour ordonner la dissolution de cette entité.", "FORBIDDEN", 403);
        }

        const payload = SovereignPurgeOrchestrator.buildPurgePayload(context);

        return await TransactionManager.execute("Dissolution Souveraine", async (mongoSession, neo4jTx) => {
            // 1. Résolution préalable stricte dans la Silice (MongoDB) via uid, slug ou pseudo
            const targetUser = await OiseauModel.findOne({
                $or: [{ uid: context.entityId }, { slug: context.entityId }, { pseudo: context.entityId }]
            }).session(mongoSession);

            if (!targetUser && !hasRootPower) {
                throw new IlotError("Entité introuvable pour la purge souveraine.", "NOT_FOUND", 404);
            }

            const canonicalUid = targetUser ? targetUser.uid : context.entityId;

            // 2. Suppression dans les collections de la Silice (MongoDB)
            await OiseauModel.deleteOne({ uid: canonicalUid }, { session: mongoSession });
            await TaskModel.deleteMany({ creatorUid: canonicalUid }, { session: mongoSession });
            await ProjectModel.deleteMany({ creatorUid: canonicalUid }, { session: mongoSession });

            // 3. Dissolution totale dans le Graphe Neo4j via l'index strict sur le canonicalUid (Phase 2)
            const cypher = `
                MATCH (u:User {uid: $canonicalUid})
                DETACH DELETE u
                RETURN count(u) AS deletedCount
            `;

            const neoResult = await neo4jTx.run(cypher, { canonicalUid });

            const deletedCountRaw = neoResult.records[0]?.get('deletedCount');
            const neo4jDeletedCount = typeof deletedCountRaw?.toNumber === 'function' 
                ? deletedCountRaw.toNumber() 
                : (Number(deletedCountRaw) || 1);

            return {
                success: true,
                payload,
                neo4jDeletedCount
            };
        });
    }
}
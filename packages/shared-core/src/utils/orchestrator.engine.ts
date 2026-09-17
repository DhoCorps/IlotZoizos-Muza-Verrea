import { findEntityBySlugOrUid, syncUniversalInteraction, SystemGraphDlqModel } from '@ilot/infrastructure';
import type { Model, Document } from 'mongoose';
import { randomBytes } from 'crypto';
import { IlotError } from '../errors/ilot.errors';

interface IEntityResult {
    uid: string;
    slug?: string;
    [key: string]: unknown;
}

export interface IMongooseModelLike<T = Record<string, unknown>> {
    findOne(query: Record<string, unknown>): {
        session(session: unknown): {
            lean(): Promise<T | null>;
        };
    };
}

/**
 * 🛡️ Utilitaire global pour résoudre strictement l'UID canonique d'une entité.
 * Éradique les "Full Graph Scans" dans Neo4j en évitant les clauses OR sur les slugs.
 */
export async function resolveCanonicalUid(
    Model: Model<Document> | IMongooseModelLike | Record<string, unknown>, 
    identifier: string, 
    entityName: string = "Entité"
): Promise<string> {
    const entity = (await findEntityBySlugOrUid(Model as never, identifier)) as IEntityResult | null;
    if (!entity) {
        throw new IlotError(`${entityName} introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return entity.uid;
}

/**
 * 🛡️ Utilitaire global pour garantir l'unicité atomique d'un slug.
 * Évite les boucles séquentielles bloquantes (Race Conditions E11000) sous forte charge.
 */
export async function ensureUniqueSlug(
    Model: Model<Document> | IMongooseModelLike | Record<string, unknown>, 
    baseSlug: string, 
    session: unknown
): Promise<string> {
    let finalSlug = baseSlug;
    const modelInstance = Model as IMongooseModelLike;
    const exists = typeof modelInstance.findOne === 'function'
        ? await modelInstance.findOne({ slug: finalSlug }).session(session).lean()
        : null;
    
    if (exists) {
        // Injection d'un suffixe aléatoire cryptographique court (4 caractères hex = 65536 possibilités)
        const randomSuffix = randomBytes(2).toString('hex');
        finalSlug = `${baseSlug}-${randomSuffix}`;
    }
    return finalSlug;
}

/**
 * 🛡️ Tissage universel sécurisé avec Fallback automatique en Dead Letter Queue (DLQ).
 * Gère gracieusement les pannes de la Matrice Neo4j sans faire crasher l'opération principale.
 */
export async function safeSyncUniversalInteraction(
    sourceUid: string,
    targetUid: string,
    type: string,
    operationName: string
): Promise<void> {
    if (sourceUid === targetUid) return; // Pas d'auto-tissage

    try {
        await syncUniversalInteraction(sourceUid, targetUid, type);
    } catch (err: unknown) {
        const error = err as Error;
        console.error(`🔥 [Orchestrator Utils] Échec du tissage universel (${operationName}), basculement DLQ :`, error);
        try {
            await SystemGraphDlqModel.create({
                operationName: `syncUniversalInteraction_${operationName}`,
                payload: { sourceUid, targetUid, type },
                error: error.message,
                status: 'PENDING_RETRY',
                retryCount: 0,
                timestamp: new Date()
            });
        } catch (dlqErr: unknown) {
            console.error("☠️ [DLQ Fatal] Impossible d'écrire dans la file de rattrapage :", dlqErr);
        }
    }
}
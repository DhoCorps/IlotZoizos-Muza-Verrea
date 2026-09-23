import { OiseauModel, DemopraxyModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { CAPABILITIES, ActionSignature, SanctionCategory } from '@ilot/types';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export interface NuisanceMetrics {
    systemicHatredScore: number; // Indice de toxicité textuelle ou comportementale (0 à 10)
    recurrenceCount: number;    // Nombre de récidives documentées dans le graphe
    recalibrationCapacity: number; // Capacité de l'oiseau à évoluer (1 à 10)
    collectiveResonance: number;  // Vibration positive apportée à la volière
    [key: string]: unknown;
}

export interface SanctuarySafetyEvaluation {
    isExcluded: boolean;
    actionMessage: string;
    exScore: number;
}

export interface DemopraxicMetricsResult {
    uid: string;
    slug?: string;
    sanctuaryVerrouille: boolean;
    demopraxyState: unknown;
}

export interface DemopraxicEvaluationResult extends SanctuarySafetyEvaluation {
    success: boolean;
    targetUid: string;
    targetSlug: string | null;
    sanctionCategory: SanctionCategory;
    tags: string[];
    user: unknown;
}

export interface DemopraxyQueryOptions {
    page?: number;
    limit?: number;
    sanctionCategory?: SanctionCategory | 'ALL';
    tag?: string;
    isExcluded?: boolean;
}

interface IOiseauEntity {
    uid: string;
    slug?: string;
    sanctuaryVerrouille?: boolean;
    demopraxyState?: unknown;
    [key: string]: unknown;
}

export class DemopraxyOrchestrator {
    /**
     * Calcule le Seuil d'Exclusion Symétrique (Ex)
     * Ex = (Haine Systémique * Récurrence) / Capacité de Recalibrage
     */
    public static calculateExclusionThreshold(metrics: NuisanceMetrics): number {
        const recalibration = Math.max(0.1, metrics.recalibrationCapacity); // Évite la division par zéro
        const exScore = (metrics.systemicHatredScore * metrics.recurrenceCount) / recalibration;
        return Number(exScore.toFixed(2));
    }

    /**
     * Détermine si un profil ou un contenu doit être mis en stase d'exclusion (banni par le vortex)
     */
    public static evaluateSanctuarySafety(metrics: NuisanceMetrics): SanctuarySafetyEvaluation {
        const exThreshold = this.calculateExclusionThreshold(metrics);

        // Seuil critique d'exclusion symétrique fixé à 15.0
        if (exThreshold >= 15.0) {
            return {
                isExcluded: true,
                exScore: exThreshold,
                actionMessage: `🌑 [Démopraxie] Seuil d'exclusion atteint (Ex = ${exThreshold}). Le vortex isole le profil pour préserver la quiétude du nid.`
            };
        }

        return {
            isExcluded: false,
            exScore: exThreshold,
            actionMessage: `🌱 [Démopraxie] Flux sous le seuil critique (Ex = ${exThreshold}). La volière absorbe et transforme le bruit.`
        };
    }

    /**
     * 🔍 Récupère l'état et les métriques démopraxiques d'un oiseau via la recherche unifiée
     */
    public async getDemopraxicMetrics(userIdentifier: string): Promise<DemopraxicMetricsResult> {
        const user = await findEntityBySlugOrUid(OiseauModel, userIdentifier) as unknown as IOiseauEntity | null;

        if (!user) {
            throw new IlotError("Oiseau introuvable dans la Silice pour auscultation démopraxique.", "NOT_FOUND", 404);
        }

        return {
            uid: user.uid,
            slug: user.slug,
            sanctuaryVerrouille: user.sanctuaryVerrouille || false,
            demopraxyState: user.demopraxyState || null
        };
    }

    /**
     * 📄 Récupère l'historique paginé des enregistrements démopraxiques (Registre public de justice)
     */
    public async getDemopraxicRegister(query: DemopraxyQueryOptions = {}) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = {};
        if (query.sanctionCategory && query.sanctionCategory !== 'ALL') {
            filter.sanctionCategory = query.sanctionCategory;
        }
        if (query.tag) {
            filter.tags = query.tag;
        }
        if (typeof query.isExcluded === 'boolean') {
            filter.isExcluded = query.isExcluded;
        }

        const [records, total] = await Promise.all([
            DemopraxyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            DemopraxyModel.countDocuments(filter)
        ]);

        return {
            success: true,
            data: records,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        };
    }

    /**
     * 🌀 ÉVALUATION ET APPLICATION DE LA STASE D'EXCLUSION
     * Enregistre l'évaluation dans MongoDB, consigne le registre démopraxique et applique l'exclusion dans Neo4j.
     */
    public async processDemopraxicEvaluation(
        userIdentifier: string, 
        metrics: NuisanceMetrics, 
        signature: ActionSignature,
        sanctionCategory: SanctionCategory = 'SYSTEMIC_HATRED',
        tags: string[] = []
    ): Promise<DemopraxicEvaluationResult> {
        // Seul un Architecte ou un système souverain peut déclencher le vortex démopraxique
        if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.MEMBER.EXILE)) {
            throw new IlotError("Aura insuffisante pour invoquer le vortex démopraxique.", "FORBIDDEN", 403);
        }

        // 1. Résolution de l'identité via l'utilitaire global unifié
        const user = await findEntityBySlugOrUid(OiseauModel, userIdentifier) as unknown as IOiseauEntity | null;
        
        if (!user) throw new IlotError("Oiseau introuvable dans la Silice.", "NOT_FOUND", 404);

        const canonicalUid = user.uid; // L'UID strict et indexé à passer au Graphe
        const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);

        return await TransactionManager.execute("Stase Démopraxique", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
            // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
            const now = new Date();
            const recordUid = `demo_${uuidv4()}`;

            // 2. Consignation officielle dans le registre de justice (DemopraxyModel)
            await DemopraxyModel.create([{
                uid: recordUid,
                userIdentifier: canonicalUid,
                actorUid: signature.actorUid,
                metrics: {
                    ...metrics,
                    computedEx: evaluation.exScore
                },
                sanctionCategory,
                tags,
                isExcluded: evaluation.isExcluded,
                actionMessage: evaluation.actionMessage
            }], { session: mongoSession });

            // 3. Mise à jour documentaire dans la Silice (MongoDB)
            const updatedUser = await OiseauModel.findOneAndUpdate(
                { uid: canonicalUid },
                { 
                    $set: { 
                        sanctuaryVerrouille: evaluation.isExcluded,
                        'demopraxyState': {
                            lastExScore: evaluation.exScore,
                            isExcluded: evaluation.isExcluded,
                            sanctionCategory,
                            tags,
                            metrics,
                            evaluatedAt: now
                        },
                        'dates.updatedAt': now
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            // 4. Propagation ultra-rapide dans le Graphe (Neo4j) via Index Strict et horodatage synchronisé
            const cypher = `
                MATCH (u:User {uid: $canonicalUid})
                SET u.sanctuaryVerrouille = $isExcluded,
                    u.demopraxyExScore = $exScore,
                    u.demopraxyCategory = $sanctionCategory,
                    u.updatedAt = datetime($now)
                RETURN u
            `;

            await neo4jTx.run(cypher, {
                canonicalUid,
                isExcluded: evaluation.isExcluded,
                exScore: evaluation.exScore,
                sanctionCategory,
                now: now.toISOString()
            });

            return {
                success: true,
                targetUid: canonicalUid,
                targetSlug: user.slug || null,
                sanctionCategory,
                tags,
                ...evaluation,
                user: updatedUser
            };
        });
    }
}
// packages/shared-core/src/sync-engine/demopraxy.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { CAPABILITIES, ActionSignature } from '@ilot/types';

export interface NuisanceMetrics {
    systemicHatredScore: number; // Indice de toxicité textuelle ou comportementale (0 à 10)
    recurrenceCount: number;    // Nombre de récidives documentées dans le graphe
    recalibrationCapacity: number; // Capacité de l'oiseau à évoluer (1 à 10)
    collectiveResonance: number;  // Vibration positive apportée à la volière
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
    public static evaluateSanctuarySafety(metrics: NuisanceMetrics): { isExcluded: boolean; actionMessage: string; exScore: number } {
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
     * 🌀 ÉVALUATION ET APPLICATION DE LA STASE D'EXCLUSION
     * Enregistre l'évaluation dans MongoDB et applique l'exclusion/verrouillage dans Neo4j si nécessaire.
     */
    public async processDemopraxicEvaluation(
        userIdentifier: string, 
        metrics: NuisanceMetrics, 
        signature: ActionSignature
    ) {
        // Seul un Architecte ou un système souverain peut déclencher le vortex démopraxique
        if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.MEMBER.EXILE)) {
            throw new IlotError("Aura insuffisante pour invoquer le vortex démopraxique.", "FORBIDDEN", 403);
        }

        const user = await OiseauModel.findOne({ 
            $or: [{ slug: userIdentifier }, { uid: userIdentifier }, { pseudo: userIdentifier }] 
        });
        
        if (!user) throw new IlotError("Oiseau introuvable dans la Silice.", "NOT_FOUND", 404);

        const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);

        return await TransactionManager.execute("Stase Démopraxique", async (mongoSession, neo4jTx) => {
            // 1. Mise à jour dans la Silice (MongoDB) : Verrouillage du sanctuaire ou stase active
            const updatedUser = await OiseauModel.findOneAndUpdate(
                { uid: user.uid },
                { 
                    $set: { 
                        sanctuaireVerrouille: evaluation.isExcluded,
                        'demopraxyState': {
                            lastExScore: evaluation.exScore,
                            isExcluded: evaluation.isExcluded,
                            metrics,
                            evaluatedAt: new Date()
                        }
                    } 
                },
                { new: true, session: mongoSession }
            ).lean();

            // 2. Propagation dans le Graphe (Neo4j)
            const cypher = `
                MATCH (u:User {uid: $uid})
                SET u.sanctuaireVerrouille = $isExcluded,
                    u.demopraxyExScore = $exScore,
                    u.updatedAt = datetime()
                RETURN u
            `;

            await neo4jTx.run(cypher, {
                uid: user.uid,
                isExcluded: evaluation.isExcluded,
                exScore: evaluation.exScore
            });

            return {
                success: true,
                targetUid: user.uid,
                targetSlug: (user as any).slug || null,
                ...evaluation,
                user: updatedUser
            };
        });
    }
}
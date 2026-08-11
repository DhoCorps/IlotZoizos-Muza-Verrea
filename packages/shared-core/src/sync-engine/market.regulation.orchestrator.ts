// packages/shared-core/src/sync-engine/market.regulation.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { SeveEngine, ExchangeItem } from '../utils/seve.engine';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';

export interface MarketEntityContext {
    uid: string;
    exchanges: ExchangeItem[];
    currentNeeds: number;
    creationFactor: number;
}

export interface MarketEvaluationResult {
    isAuthorized: boolean;
    vitalBalance: number;
    latencyMs: number;
    message: string;
}

export interface ConnectedRegulationResult extends MarketEvaluationResult {
    success: boolean;
    targetUid: string;
    user: any;
}

export interface MarketContractPayload {
    contractUid: string;
    initiatorUid: string;
    targetUid: string;
    contractType: 'GIFT' | 'BARTER' | 'LOAN';
    virtualValueAmount: number; // Montant en énergie/monnaie virtuelle
    currency: string;
    interestRate?: number;      // Pourcentage (ex: 5.5 pour 5.5%)
    durationDays?: number;      // Durée du prêt avant exigibilité
    description?: string;
}

export class MarketRegulationOrchestrator {
    
    /**
     * Utilitaire interne pour résoudre strictement l'UID canonique via la Silice (MongoDB)
     */
    private async resolveCanonicalUid(identifier: string): Promise<string> {
        const user = await OiseauModel.findOne({ 
            $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }] 
        }).lean();
        
        if (!user) {
            throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
        }
        return (user as any).uid;
    }

    /**
     * ⚖️ ÉVALUATION DE L'ACCÈS AU MARCHÉ ET AU TROC
     */
    public static evaluateMarketAccess(context: MarketEntityContext, minJustTakeThreshold: number = 1.0): MarketEvaluationResult {
        const vitalBalance = SeveEngine.calculateVitalBalance(context.exchanges);
        
        const gifts = context.exchanges.filter(e => e.type === 'GIFT').reduce((s, e) => s + e.value, 0);
        const justTake = SeveEngine.calculateJustTake(gifts, context.currentNeeds, context.creationFactor);

        if (justTake < minJustTakeThreshold && gifts === 0) {
            return {
                isAuthorized: false,
                vitalBalance,
                latencyMs: 0,
                message: "Prise rejetée : l'échange est stérile ou déséquilibré par rapport aux besoins."
            };
        }

        let latencyMs = 0;
        let message = "Échange équilibré. Accès fluide au marché.";

        if (vitalBalance < 0) {
            latencyMs = Math.min(5000, Math.abs(vitalBalance) * 200);
            message = `Accès autorisé sous latence : l'Oiseau est en déficit énergétique (Lambda = ${vitalBalance}).`;
        }

        return { isAuthorized: true, vitalBalance, latencyMs, message };
    }

    /**
     * 🔄 TRAITEMENT DE LA RÉGULATION CONNECTÉE (Double Scellement Mongo/Neo4j)
     */
    public async processConnectedRegulation(
        userIdentifier: string,
        currentNeeds: number,
        creationFactor: number,
        minJustTakeThreshold: number,
        signature: ActionSignature
    ): Promise<ConnectedRegulationResult> {
        if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

        const canonicalUid = await this.resolveCanonicalUid(userIdentifier);
        const user = await OiseauModel.findOne({ uid: canonicalUid }).lean();

        const context: MarketEntityContext = {
            uid: canonicalUid,
            exchanges: (user as any).exchanges || [],
            currentNeeds,
            creationFactor
        };

        const evaluation = MarketRegulationOrchestrator.evaluateMarketAccess(context, minJustTakeThreshold);

        return await TransactionManager.execute("Régulation de Marché", async (mongoSession, neo4jTx) => {
            const updatedUser = await OiseauModel.findOneAndUpdate(
                { uid: canonicalUid },
                {
                    $set: {
                        'marketRegulationState': {
                            ...evaluation,
                            evaluatedAt: new Date()
                        }
                    }
                },
                { new: true, session: mongoSession }
            ).lean();

            // Sédimentation dans le Graphe pour impacter la vitesse des futures requêtes Neo4j
            const cypher = `
                MATCH (u:User {uid: $canonicalUid})
                SET u.marketAuthorized = $isAuthorized,
                    u.vitalBalance = $vitalBalance,
                    u.marketLatencyMs = $latencyMs,
                    u.updatedAt = datetime()
                RETURN u
            `;

            await neo4jTx.run(cypher, {
                canonicalUid,
                isAuthorized: evaluation.isAuthorized,
                vitalBalance: evaluation.vitalBalance,
                latencyMs: evaluation.latencyMs
            });

            return {
                success: true,
                targetUid: canonicalUid,
                ...evaluation,
                user: updatedUser
            };
        });
    }

    /**
     * 📜 FORGE DE CONTRAT DE MARCHÉ (Don, Troc, Prêt avec Intérêt)
     * Scelle l'intention contractuelle dans le graphe de l'Îlot.
     */
    public async proposeMarketContract(
        payload: MarketContractPayload,
        signature: ActionSignature
    ): Promise<{ success: boolean; contractUid: string }> {
        if (signature.actorUid !== payload.initiatorUid) {
            throw new IlotError("Vous ne pouvez pas forger un contrat au nom d'un autre oiseau.", "FORBIDDEN", 403);
        }

        if (payload.initiatorUid === payload.targetUid) {
            throw new IlotError("Un contrat nécessite deux entités distinctes.", "BAD_REQUEST", 400);
        }

        const initiatorCanonicalUid = await this.resolveCanonicalUid(payload.initiatorUid);
        const targetCanonicalUid = await this.resolveCanonicalUid(payload.targetUid);

        return await TransactionManager.execute("Forge de Contrat Marchand", async (mongoSession, neo4jTx) => {
            
            const cypher = `
                MATCH (initiator:User {uid: $initiatorUid})
                MATCH (target:User {uid: $targetUid})
                CREATE (c:MarketContract {
                    uid: $contractUid,
                    type: $contractType,
                    amount: $virtualValueAmount,
                    currency: $currency,
                    interestRate: $interestRate,
                    durationDays: $durationDays,
                    description: $description,
                    status: 'PENDING',
                    createdAt: datetime()
                })
                CREATE (initiator)-[:PROPOSED_CONTRACT]->(c)
                CREATE (c)-[:TARGETS_USER]->(target)
                RETURN c.uid AS contractUid
            `;

            const neoResult = await neo4jTx.run(cypher, {
                initiatorUid: initiatorCanonicalUid,
                targetUid: targetCanonicalUid,
                contractUid: payload.contractUid,
                contractType: payload.contractType,
                virtualValueAmount: payload.virtualValueAmount,
                currency: payload.currency,
                interestRate: payload.interestRate || 0,
                durationDays: payload.durationDays || 0,
                description: payload.description || `Proposition de ${payload.contractType}`
            });

            if (neoResult.records.length === 0) {
                throw new IlotError("Échec du scellement du contrat dans la Matrice Neo4j.", "INTERNAL_ERROR", 500);
            }

            return { success: true, contractUid: payload.contractUid };
        });
    }
}
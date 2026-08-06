// packages/shared-core/src/sync-engine/market.regulation.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
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
    targetSlug: string | null;
    user: any;
}

export class MarketRegulationOrchestrator {
    
    /**
     * ⚖️ ÉVALUATION DE L'ACCÈS AU MARCHÉ ET AU TROC
     * Calcule la balance vitale (Lambda) et la juste prise (Jp) pour moduler l'accès (latence ou rejet).
     */
    public static evaluateMarketAccess(context: MarketEntityContext, minJustTakeThreshold: number = 1.0): MarketEvaluationResult {
        const vitalBalance = SeveEngine.calculateVitalBalance(context.exchanges);
        
        const gifts = context.exchanges.filter(e => e.type === 'GIFT').reduce((s, e) => s + e.value, 0);
        const justTake = SeveEngine.calculateJustTake(gifts, context.currentNeeds, context.creationFactor);

        // Rejet si la juste prise est stérile (ex: pas de dons du tout face à des prises excessives)
        if (justTake < minJustTakeThreshold && gifts === 0) {
            return {
                isAuthorized: false,
                vitalBalance,
                latencyMs: 0,
                message: "Prise rejetée : l'échange est stérile ou déséquilibré par rapport aux besoins."
            };
        }

        // Gestion de la latence en cas de déficit énergétique (Lambda < 0)
        let latencyMs = 0;
        let message = "Échange équilibré. Accès fluide au marché.";

        if (vitalBalance < 0) {
            // Latence proportionnelle au déficit (ex: 200ms par point de déficit, plafonnée à 5000ms)
            latencyMs = Math.min(5000, Math.abs(vitalBalance) * 200);
            message = `Accès autorisé sous latence : l'Oiseau est en déficit énergétique (Lambda = ${vitalBalance}).`;
        }

        return {
            isAuthorized: true,
            vitalBalance,
            latencyMs,
            message
        };
    }

    /**
     * 🔄 TRAITEMENT DE LA RÉGULATION CONNECTÉE
     * Résout l'Oiseau dans la Silice (via slug ou uid), évalue son accès et persiste son état.
     */
    public async processConnectedRegulation(
        userIdentifier: string,
        currentNeeds: number,
        creationFactor: number,
        minJustTakeThreshold: number,
        signature: ActionSignature
    ): Promise<ConnectedRegulationResult> {
        const user = await OiseauModel.findOne({
            $or: [{ slug: userIdentifier }, { uid: userIdentifier }, { pseudo: userIdentifier }]
        });

        if (!user) {
            throw new IlotError("Oiseau introuvable dans la Silice pour régulation.", "NOT_FOUND", 404);
        }

        const context: MarketEntityContext = {
            uid: user.uid,
            exchanges: (user as any).exchanges || [],
            currentNeeds,
            creationFactor
        };

        const evaluation = MarketRegulationOrchestrator.evaluateMarketAccess(context, minJustTakeThreshold);

        const updatedUser = await OiseauModel.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                    'marketRegulationState': {
                        ...evaluation,
                        evaluatedAt: new Date()
                    }
                }
            },
            { new: true }
        ).lean();

        return {
            success: true,
            targetUid: user.uid,
            targetSlug: (user as any).slug || null,
            ...evaluation,
            user: updatedUser
        };
    }
}
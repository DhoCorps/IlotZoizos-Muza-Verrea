// packages/shared-core/src/sync-engine/market.regulation.orchestrator.ts
import { SeveEngine, ExchangeItem } from '../utils/seve.engine';

export interface MarketEntityContext {
    uid: string;
    exchanges: ExchangeItem[];
    currentNeeds: number;
    creationFactor: number; // Omega
}

export interface MarketRegulationResult {
    isAuthorized: boolean;
    vitalBalance: number;
    latencyMs: number; // Temps de latence appliqué pour ralentir l'impulsion de consommation
    message: string;
}

export class MarketRegulationOrchestrator {
    private static readonly THRESHOLD_JP = 1.0;

    /**
     * Évalue si une transaction de prise/achat est juste et régule le flux par la latence
     */
    public static evaluateMarketAccess(context: MarketEntityContext, takeValue: number): MarketRegulationResult {
        // 1. Calcul de la Balance Vitale (Lambda)
        const vitalBalance = SeveEngine.calculateVitalBalance(context.exchanges);

        // Total des dons de l'entité
        const totalGifts = context.exchanges
            .filter(e => e.type === 'GIFT')
            .reduce((s, e) => s + e.value, 0);

        // 2. Calcul de la Juste Prise (Jp)
        const justTake = SeveEngine.calculateJustTake(totalGifts, context.currentNeeds, context.creationFactor);

        // 3. Logique de régulation et de latence
        if (vitalBalance < 0) {
            // Déficit énergétique : application d'un coefficient de latence proportionnel au creux
            const deficitPenalty = Math.abs(vitalBalance);
            const latencyMs = Math.min(5000, deficitPenalty * 200); // Plafonné à 5 secondes

            console.warn(`⚖️ [Market] Déficit détecté (Lambda = ${vitalBalance}). Latence de ${latencyMs}ms imposée à l'Oiseau ${context.uid}.`);

            return {
                isAuthorized: true, // Autorisé mais ralenti pour inviter à la conscience
                vitalBalance,
                latencyMs,
                message: `L'Îlot ralentit ton impulsion. Ton équilibre accuse un déficit (Lambda = ${vitalBalance}). Pense à offrir avant de prendre.`
            };
        }

        // Si la prise est stérile (Jp en dessous du seuil critique)
        if (justTake < this.THRESHOLD_JP) {
            return {
                isAuthorized: false,
                vitalBalance,
                latencyMs: 0,
                message: `🌑 [Market] Prise rejetée. Le coefficient de création (Jp = ${justTake}) est insuffisant pour justifier ce prélèvement.`
            };
        }

        return {
            isAuthorized: true,
            vitalBalance,
            latencyMs: 0,
            message: `🌱 [Market] Échange équilibré. Bonne circulation de la sève.`
        };
    }
}
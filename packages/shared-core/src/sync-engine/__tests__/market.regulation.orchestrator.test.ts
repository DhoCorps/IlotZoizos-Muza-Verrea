// packages/shared-core/src/sync-engine/__tests__/market.regulation.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketRegulationOrchestrator, MarketEntityContext } from '../market.regulation.orchestrator';
import { OiseauModel } from '../../../../infrastructure/src/database/models/nosql/user.model';
import { IlotError } from '../../errors/ilot.errors';

// Mock de Mongoose
vi.mock('../../../../infrastructure/src/database/models/nosql/user.model', () => ({
    OiseauModel: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    }
}));

describe('MarketRegulationOrchestrator - Régulation de la Marketplace et du Troc', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('⚖️ doit imposer une latence et autoriser l’accès si l’oiseau est en déficit énergétique (Lambda < 0)', () => {
        const context: MarketEntityContext = {
            uid: 'bird-taker-01',
            exchanges: [
                { type: 'TAKE', value: 40 },
                { type: 'GIFT', value: 10 }
            ], // Balance vitale = 10 - 40 = -30
            currentNeeds: 5,
            creationFactor: 1.0
        };

        const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 5);

        expect(result.isAuthorized).toBe(true);
        expect(result.vitalBalance).toBe(-30);
        expect(result.latencyMs).toBeGreaterThan(0);
        expect(result.message).toContain("déficit");
    });

    it('🌑 doit rejeter l’accès si la prise est stérile (Juste Prise en dessous du seuil critique)', () => {
        const context: MarketEntityContext = {
            uid: 'bird-sterile-02',
            exchanges: [
                { type: 'GIFT', value: 0 }
            ], // Total des dons = 0 -> Juste Prise = 0 < 1.0
            currentNeeds: 10,
            creationFactor: 0.1
        };

        const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 5);

        expect(result.isAuthorized).toBe(false);
        expect(result.latencyMs).toBe(0);
        expect(result.message).toContain("Prise rejetée");
    });

    it('🌱 doit autoriser l’accès sans latence si l’échange est parfaitement équilibré', () => {
        const context: MarketEntityContext = {
            uid: 'bird-pure-03',
            exchanges: [
                { type: 'GIFT', value: 50 },
                { type: 'TAKE', value: 20 }
            ], // Balance vitale = 30 >= 0
            currentNeeds: 2,
            creationFactor: 2.0
        };

        const result = MarketRegulationOrchestrator.evaluateMarketAccess(context, 5);

        expect(result.isAuthorized).toBe(true);
        expect(result.vitalBalance).toBe(30);
        expect(result.latencyMs).toBe(0);
        expect(result.message).toContain("Échange équilibré");
    });

    describe('processConnectedRegulation', () => {
        const orchestrator = new MarketRegulationOrchestrator();

        it('❌ doit lever une erreur 404 si l’oiseau est introuvable dans la Silice', async () => {
            (OiseauModel.findOne as any).mockResolvedValueOnce(null);

            const signature = { actorUid: 'actor-1', capabilities: [] };

            await expect(
                orchestrator.processConnectedRegulation('ghost-bird', 5, 2, 1, signature)
            ).rejects.toThrow(IlotError);
        });

        it('⚖️ doit évaluer et persister l’état de régulation si l’oiseau est trouvé', async () => {
            const mockUser = {
                uid: 'bird-uid-99',
                slug: 'bird-slug',
                exchanges: [{ type: 'TAKE', value: 20 }, { type: 'GIFT', value: 5 }]
            };
            (OiseauModel.findOne as any).mockResolvedValueOnce(mockUser);
            (OiseauModel.findOneAndUpdate as any).mockResolvedValueOnce(mockUser);

            const signature = { actorUid: 'actor-1', capabilities: [] };
            const result = await orchestrator.processConnectedRegulation('bird-slug', 5, 2, 1, signature);

            expect(result.targetUid).toBe('bird-uid-99');
            expect(result.isAuthorized).toBe(true);
            expect(result.vitalBalance).toBe(-15);
            expect(result.latencyMs).toBe(3000); // Plafonné ou calculé (15 * 200 = 3000)
            expect(OiseauModel.findOneAndUpdate).toHaveBeenCalled();
        });
    });
});
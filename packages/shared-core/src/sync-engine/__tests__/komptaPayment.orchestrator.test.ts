// packages/shared-core/src/sync-engine/__tests__/komptaPayment.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator } from '../komptaPayment.orchestrator';
import { WalletModel } from '../../../../infrastructure/src/database/models/nosql/wallet.model';
import { KomptaLedgerService } from '../../../../infrastructure/src/database/services/komptaLedger.services';
import { TransactionManager } from '../transactionManager';

vi.mock('../../../../infrastructure/src/database/services/komptaLedger.services', () => ({
    KomptaLedgerService: {
        recordEntry: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../../../../infrastructure/src/database/models/nosql/wallet.model', () => ({
    WalletModel: {
        findOne: vi.fn(),
    },
}));

vi.mock('../transactionManager', () => ({
    TransactionManager: {
        execute: vi.fn(async (_name, callback) => {
            const mockMongoSession = {};
            const mockNeo4jTx = {
                run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_id' }] })
            };
            return await callback(mockMongoSession, mockNeo4jTx);
        }),
    },
}));

describe('KomptaPaymentOrchestrator - Économie Souveraine et Redistribution', () => {
    let orchestrator: KomptaPaymentOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new KomptaPaymentOrchestrator();
    });

    it('🟢 devrait réussir une transaction marchande et prélever la taxe de redistribution pour la Canopée', async () => {
        const mockBuyerWallet = {
            userId: 'bird_buyer',
            balance: 10000, // 100 EUR
            currency: 'EUR',
            save: vi.fn().mockResolvedValue(true),
        };
        const mockMerchantWallet = {
            userId: 'bird_merchant',
            balance: 1000, // 10 EUR
            currency: 'EUR',
            save: vi.fn().mockResolvedValue(true),
        };
        const mockTreasuryWallet = {
            userId: 'SYSTEM_CANOPY_TREASURY',
            balance: 0,
            currency: 'EUR',
            save: vi.fn().mockResolvedValue(true),
        };

        vi.mocked(WalletModel.findOne)
            .mockReturnValueOnce({ session: vi.fn().mockResolvedValueOnce(mockBuyerWallet) } as any)
            .mockReturnValueOnce({ session: vi.fn().mockResolvedValueOnce(mockMerchantWallet) } as any)
            .mockReturnValueOnce({ session: vi.fn().mockResolvedValueOnce(mockTreasuryWallet) } as any);

        const payload = {
            transactionUid: 'tx_store_1',
            buyerUid: 'bird_buyer',
            recipientUid: 'bird_merchant',
            amountCents: 5000, // 50 EUR d'achat
            currency: 'EUR',
            storeUid: 'store_123',
            description: 'Vente d\'un artefact rare',
        };

        const signature = {
            actorUid: 'bird_buyer',
            capabilities: [],
        };

        const result = await orchestrator.executeStoreTransaction(payload, signature as any);

        expect(result.success).toBe(true);
        expect(result.transactionUid).toBe('tx_store_1');
        
        // Vérification de la déduction acheteur (5000 cents)
        expect(mockBuyerWallet.balance).toBe(5000); 
        // Vérification du marchand (1000 + 4950 [99% de 5000])
        expect(mockMerchantWallet.balance).toBe(5950); 
        // Vérification du Trésor de l'Îlot (Prélèvement de la taxe de 1% -> 50 cents)
        expect(mockTreasuryWallet.balance).toBe(50); 

        // Vérification que les trois écritures Kompta ont bien été enregistrées dans le Grand Livre
        expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(3);
    });
});
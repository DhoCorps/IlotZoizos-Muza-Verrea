import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaPaymentOrchestrator } from '../komptaPayment.orchestrator';
import { WalletModel } from '../../../../infrastructure/src/database/models/nosql/wallet.model';
import { KomptaLedgerService } from '../../../../infrastructure/src/database/services/komptaLedger.services';
import { TransactionManager } from '../transactionManager';

// Mock de KomptaLedgerService avec enregistrement en tant que spy fonctionnel
vi.mock('../../../../infrastructure/src/database/services/komptaLedger.services', () => ({
    KomptaLedgerService: {
        recordEntry: vi.fn().mockResolvedValue(true),
    },
}));

// Mock du modèle WalletModel avec support du chaînage Mongoose (.findOne().session())
vi.mock('../../../../infrastructure/src/database/models/nosql/wallet.model', () => ({
    WalletModel: {
        findOne: vi.fn(),
    },
}));

// Mock du TransactionManager pour exécuter directement le callback avec des sessions factices
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

describe('KomptaPaymentOrchestrator - Tokenisation & Paiements P2P', () => {
    let orchestrator: KomptaPaymentOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new KomptaPaymentOrchestrator();
    });

    it('🟢 devrait réussir un transfert P2P et enregistrer les écritures Kompta', async () => {
        const mockSenderWallet = {
            userId: 'bird_alice',
            balance: 2000,
            currency: 'EUR',
            save: vi.fn().mockResolvedValue(true),
        };

        const mockRecipientWallet = {
            userId: 'bird_bob',
            balance: 500,
            currency: 'EUR',
            save: vi.fn().mockResolvedValue(true),
        };

        // 🪄 Simulation du chaînage Mongoose : findOne retourne un objet ayant la méthode .session()
        vi.mocked(WalletModel.findOne)
            .mockReturnValueOnce({
                session: vi.fn().mockResolvedValueOnce(mockSenderWallet)
            } as any)
            .mockReturnValueOnce({
                session: vi.fn().mockResolvedValueOnce(mockRecipientWallet)
            } as any);

        const payload = {
            transferUid: 'tx_p2p_1',
            senderUid: 'bird_alice',
            recipientUid: 'bird_bob',
            amountCents: 500,
            currency: 'EUR',
            description: 'Café suspendu',
        };

        const signature = {
            actorUid: 'bird_alice',
            capabilities: ['*'],
            issuedAt: new Date(),
        };

        const result = await orchestrator.executeDirectTransfer(payload, signature);

        expect(result.success).toBe(true);
        expect(result.transferUid).toBe('tx_p2p_1');
        expect(result.newSenderBalance).toBe(1500);

        // Vérification des appels au service Kompta Ledger
        expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
        expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUid: 'bird_alice',
                counterpartyUid: 'bird_bob',
                amountCents: 500,
                type: 'DEBIT',
                category: 'SYSTEM_TRANSFER',
            })
        );
    });

    it('🟢 devrait réussir un troc d\'objet et consigner l\'écriture de type BARTER dans Kompta', async () => {
        const payload = {
            exchangeUid: 'ex_1',
            senderUid: 'bird_alice',
            recipientUid: 'bird_bob',
            offeredItemUid: 'item_synth_1',
            targetTitle: 'Sonate Numérique',
            description: 'Troc de synthé contre partition',
        };

        const signature = {
            actorUid: 'bird_alice',
            capabilities: ['*'],
            issuedAt: new Date(),
        };

        const result = await orchestrator.executeItemExchange(payload, signature);

        expect(result.success).toBe(true);
        expect(result.exchangeUid).toBe('ex_1');
        
        // Vérification du hook Kompta Ledger pour le troc
        expect(KomptaLedgerService.recordEntry).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUid: 'bird_alice',
                counterpartyUid: 'bird_bob',
                amountCents: 0,
                category: 'BARTER',
            })
        );
    });
});
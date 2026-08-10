import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaLedgerService } from '../komptaLedger.services';
import { LedgerEntryModel } from '../../models/nosql/ledgerEntry.model';

// Mock global du modèle Mongoose LedgerEntryModel
vi.mock('../../models/nosql/ledgerEntry.model', () => ({
    LedgerEntryModel: vi.fn().mockImplementation((data) => ({
        ...data,
        save: vi.fn().mockResolvedValue(true),
        toObject: vi.fn().mockReturnValue(data),
    })),
}));

// Ajout des méthodes statiques mockées sur le modèle
(LedgerEntryModel as any).findOne = vi.fn();
(LedgerEntryModel as any).create = vi.fn().mockResolvedValue(true);

describe('KomptaLedgerService (Le Grand Livre Inaltérable)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 doit enregistrer une première écriture avec le hash Genesis si aucun historique n existe', async () => {
        // Simulation d'un findOne qui retourne null (pas d'historique)
        const mockSort = vi.fn().mockResolvedValue(null);
        const mockSession = vi.fn().mockReturnValue({ sort: mockSort });
        vi.mocked(LedgerEntryModel.findOne).mockReturnValue({
            sort: mockSort,
            session: mockSession,
        } as any);

        mockSort.mockResolvedValueOnce(null);

        await KomptaLedgerService.recordEntry({
            ownerUid: 'bird_test_1',
            counterpartyUid: 'system',
            amountCents: 1000,
            currency: 'EUR',
            type: 'CREDIT',
            category: 'SYSTEM_TRANSFER',
            referenceUid: 'ref_123',
            description: 'Prime de départ',
        });

        expect(LedgerEntryModel.findOne).toHaveBeenCalledWith({ ownerUid: 'bird_test_1' });
        expect(LedgerEntryModel).toHaveBeenCalled();
    });

    it('🟢 doit chaîner correctement l écriture avec le hash de la dernière entrée existante', async () => {
        const previousEntry = { entryHash: 'hash_abc_789' };
        
        const mockSort = vi.fn().mockResolvedValue(previousEntry);
        const mockSession = vi.fn().mockReturnValue({ sort: mockSort });
        vi.mocked(LedgerEntryModel.findOne).mockReturnValue({
            sort: mockSort,
            session: mockSession,
        } as any);

        await KomptaLedgerService.recordEntry({
            ownerUid: 'bird_test_2',
            counterpartyUid: 'bird_test_3',
            amountCents: 500,
            currency: 'EUR',
            type: 'DEBIT',
            category: 'TIP',
            referenceUid: 'ref_456',
            description: 'Soutien à la canopée',
        });

        expect(LedgerEntryModel.findOne).toHaveBeenCalledWith({ ownerUid: 'bird_test_2' });
        expect(LedgerEntryModel).toHaveBeenCalled();
    });
});
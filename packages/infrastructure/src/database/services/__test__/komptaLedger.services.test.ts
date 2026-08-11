import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { KomptaLedgerService, RecordLedgerParams } from '../komptaLedger.services';
import { LedgerEntryModel } from '../../models/nosql/ledgerEntry.model';

// 🛡️ Mock du modèle Mongoose pour éviter les appels réels à MongoDB
vi.mock('../../models/nosql/ledgerEntry.model');

describe('KomptaLedgerService (Grand Livre Souverain)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordEntry (Enregistrement Inaltérable)', () => {
    const mockParams: RecordLedgerParams = {
      ownerUid: 'bird_sender',
      counterpartyUid: 'bird_recipient',
      amount: 10.5,
      amountCents: 1050,
      currency: 'TOX',
      type: 'DEBIT',
      category: 'SYSTEM_TRANSFER',
      referenceUid: 'ref_123',
      description: 'Test transfert'
    };

    it('🟢 doit enregistrer une entrée avec un hachage SHA-256 valide et chaîné', async () => {
      // Simulation : Aucune entrée précédente (génération du hash genesis)
      vi.mocked(LedgerEntryModel.findOne).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null)
      } as any);

      // Mock de l'objet Mongoose retourné lors du .save() ou .create()
      const saveMock = vi.fn();
      vi.mocked(LedgerEntryModel).mockImplementation(() => ({
        save: saveMock,
        toObject: vi.fn().mockReturnValue(mockParams)
      } as any));

      await KomptaLedgerService.recordEntry(mockParams);

      // Vérification de l'appel à create (ou save)
      expect(LedgerEntryModel).toHaveBeenCalledTimes(1);
      const savedCallArgs = vi.mocked(LedgerEntryModel).mock.calls[0][0] as any;

      // Vérification que le hash existe et fait 64 caractères (SHA-256)
      expect(savedCallArgs.entryHash).toBeTypeOf('string');
      expect(savedCallArgs.entryHash.length).toBe(64); 
      
      // Vérification que le previousHash est bien le genesis par défaut
      expect(savedCallArgs.previousHash).toBe('ROOT_GENESIS_TOX_HASH');
    });

    it('🟢 doit chaîner le hash avec l\'entrée précédente', async () => {
      const previousEntry = { entryHash: 'PREVIOUS_HASH_MOCK' };
      
      // Simulation : Une entrée précédente existe
      vi.mocked(LedgerEntryModel.findOne).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        session: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(previousEntry)
      } as any);

      const saveMock = vi.fn();
      vi.mocked(LedgerEntryModel).mockImplementation(() => ({
        save: saveMock,
        toObject: vi.fn().mockReturnValue(mockParams)
      } as any));

      await KomptaLedgerService.recordEntry(mockParams);

      const savedCallArgs = vi.mocked(LedgerEntryModel).mock.calls[0][0] as any;

      // Vérification que le nouveau hash inclut bien le hash précédent
      expect(savedCallArgs.previousHash).toBe('PREVIOUS_HASH_MOCK');
    });
  });

  describe('getUserBalances (Calcul de Soldes)', () => {
    it('🟢 doit calculer correctement le solde cumulé pour une devise', async () => {
      // Simulation de plusieurs écritures
      const mockEntries = [
        { currency: 'TOX', type: 'CREDIT', amount: 100 },
        { currency: 'TOX', type: 'DEBIT', amount: 30 },
        { currency: 'TOX', type: 'CREDIT', amount: 10 },
        { currency: 'DHO', type: 'CREDIT', amount: 500 }
      ];

      vi.mocked(LedgerEntryModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockEntries)
      } as any);

      const balances = await KomptaLedgerService.getUserBalances('bird_bank');

      expect(balances).toEqual({
        TOX: 80, // 100 - 30 + 10
        DHO: 500 // 500
      });
    });
  });
});
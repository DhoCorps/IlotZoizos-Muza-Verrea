import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaLedgerService } from '../komptaLedger.services';
import { LedgerEntryModel } from '../../models/nosql/ledgerEntry.model';
import crypto from 'crypto';

vi.mock('../../models/nosql/ledgerEntry.model');
vi.mock('crypto');

describe('KomptaLedgerService - Extension Analytique & Fiscale', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(crypto.randomBytes).mockReturnValue({
      toString: () => 'mockhex',
    } as any);
    
    vi.mocked(crypto.createHash).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mock_sha256_hash'),
    } as any);

    // Mock du findOne pour récupérer le genesis hash
    const mockQuery = {
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(LedgerEntryModel.findOne).mockReturnValue(mockQuery as any);
  });

  it('doit enregistrer une écriture de vente (STORE_SALE) avec ventilation fiscale (HT, TVA, Frais)', async () => {
    const mockSave = vi.fn().mockResolvedValue(true);
    vi.mocked(LedgerEntryModel).mockImplementation(() => ({
      save: mockSave,
    }) as any);

    await KomptaLedgerService.recordEntry({
      ownerUid: 'marchand_1',
      counterpartyUid: 'client_1',
      counterpartyPseudo: 'Oiseau_Libre',
      amountCents: 1200,    // 12.00 € TTC
      amountHTCents: 1000,  // 10.00 € HT
      taxCents: 200,        // 2.00 € TVA
      feeCents: 50,         // 0.50 € Frais Stripe
      currency: 'EUR',
      type: 'CREDIT',
      category: 'STORE_SALE',
      referenceUid: 'ref_001',
      orderUid: 'order_12345',
      invoiceUid: 'inv_12345',
      description: 'Vente de l\'Artefact',
      createdAt: new Date('2026-09-24T12:00:00.000Z')
    });

    // 1. Vérifie que le constructeur a bien reçu les champs ERP/Fiscaux
    expect(LedgerEntryModel).toHaveBeenCalledWith(expect.objectContaining({
      ownerUid: 'marchand_1',
      counterpartyPseudo: 'Oiseau_Libre',
      amountCents: 1200,
      amountHTCents: 1000,
      taxCents: 200,
      feeCents: 50,
      orderUid: 'order_12345',
      invoiceUid: 'inv_12345',
      entryHash: 'mock_sha256_hash'
    }));

    // 2. Vérifie que le hachage contient bien les montants HT, TAX et FEE pour empêcher la falsification
    expect(crypto.createHash('sha256').update).toHaveBeenCalledWith(
      expect.stringContaining('|1200|1000|200|50|EUR|CREDIT|STORE_SALE')
    );
    expect(mockSave).toHaveBeenCalled();
  });

  it('doit calculer dynamiquement la balance de l\'Oiseau avec amountCents', async () => {
    vi.mocked(LedgerEntryModel.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { currency: 'EUR', type: 'CREDIT', amountCents: 5000 },
        { currency: 'EUR', type: 'DEBIT', amountCents: 1500 },
      ])
    } as any);

    const balances = await KomptaLedgerService.getUserBalances('bird_1');
    
    expect(balances['EUR']).toBe(3500); // 5000 - 1500
  });
});
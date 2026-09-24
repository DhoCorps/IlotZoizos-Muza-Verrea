import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KomptaLedgerOrchestrator } from '../komptaLedger.orchestrator';
import { KomptaLedgerService } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// 🛡️ Mock unifié et sécurisé de l'infrastructure pour le Grand Livre sous l'alias centralisé
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    KomptaLedgerService: {
      recordEntry: vi.fn().mockResolvedValue(true)
    }
  };
});

// 🛡️ Création d'un espion strict pour Neo4j
const mockNeo4jRun = vi.fn().mockResolvedValue({ records: [] });

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb({}, { run: mockNeo4jRun }))
  }
}));

vi.mock('@/infrastructure/src/database/models/nosql/ledgerEntry.model', () => ({
  LedgerEntryModel: {
    findOne: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      session: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null)
    }),
    create: vi.fn().mockResolvedValue(true)
  }
}));

describe('KomptaLedgerOrchestrator - Moteur de Double Entrée & Sédimentation Graphe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter le transfert si le montant est négatif ou nul', async () => {
    await expect(
      KomptaLedgerOrchestrator.transfer({
        fromUid: 'bird_1',
        toUid: 'bird_2',
        amountCents: 0,
        currency: 'DHO',
        category: 'BARTER',
        referenceUid: 'ref_1',
        description: 'Test invalide'
      })
    ).rejects.toThrow(IlotError);
  });

  it('🟢 doit exécuter un débit et un crédit atomiques via le TransactionManager ET tisser le lien Neo4j', async () => {
    await KomptaLedgerOrchestrator.transfer({
      fromUid: 'bird_1',
      toUid: 'bird_2',
      amountCents: 100, // Passé en amountCents
      currency: 'TOX',
      category: 'BARTER',
      referenceUid: 'ref_99',
      description: 'Échange de TôX contre un atome'
    });

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);
    
    // Vérifie le débit
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[0][0]).toMatchObject({
      ownerUid: 'bird_1',
      type: 'DEBIT',
      currency: 'TOX',
      amountCents: 100
    });

    // Vérifie le crédit
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[1][0]).toMatchObject({
      ownerUid: 'bird_2',
      type: 'CREDIT',
      currency: 'TOX',
      amountCents: 100
    });

    // 🚀 Vérifie la sédimentation Neo4j
    expect(mockNeo4jRun).toHaveBeenCalledTimes(1);
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (buyer)-[r:TRANSACTED_WITH {currency: $currency}]->(seller)'),
      expect.objectContaining({
        fromUid: 'bird_1',
        toUid: 'bird_2',
        currency: 'TOX',
        amountCents: 100
      })
    );
  });

  it('🟢 doit ventiler la fiscalité et croiser les informations de la contrepartie lors d\'une vente (STORE_SALE)', async () => {
    await KomptaLedgerOrchestrator.transfer({
      fromUid: 'client_88',
      fromPseudo: 'AcheteurFou',
      toUid: 'marchand_1',
      toPseudo: 'VendeurPro',
      amountCents: 1200,
      amountHTCents: 1000,
      taxCents: 200,
      feeCents: 50,
      currency: 'EUR',
      category: 'STORE_SALE',
      referenceUid: 'ref_sale_001',
      orderUid: 'order_123',
      invoiceUid: 'inv_123',
      description: 'Achat Artefact E-Commerce'
    });

    expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    expect(KomptaLedgerService.recordEntry).toHaveBeenCalledTimes(2);

    // 1. Débit pour l'acheteur (Client) -> La catégorie devient STORE_PURCHASE
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[0][0]).toMatchObject({
      ownerUid: 'client_88',
      counterpartyUid: 'marchand_1',
      counterpartyPseudo: 'VendeurPro', // Il voit le pseudo du vendeur
      amountCents: 1200,
      amountHTCents: 1000,
      taxCents: 200,
      feeCents: 50,
      currency: 'EUR',
      type: 'DEBIT',
      category: 'STORE_PURCHASE', // Règle d'inversion miroir appliquée
      orderUid: 'order_123',
      invoiceUid: 'inv_123'
    });

    // 2. Crédit pour le vendeur (Marchand) -> Catégorie STORE_SALE
    expect(vi.mocked(KomptaLedgerService.recordEntry).mock.calls[1][0]).toMatchObject({
      ownerUid: 'marchand_1',
      counterpartyUid: 'client_88',
      counterpartyPseudo: 'AcheteurFou', // Il voit le pseudo du client
      amountCents: 1200,
      amountHTCents: 1000,
      taxCents: 200,
      feeCents: 50,
      currency: 'EUR',
      type: 'CREDIT',
      category: 'STORE_SALE', // Reste une vente pour le marchand
      orderUid: 'order_123',
      invoiceUid: 'inv_123'
    });

    // 🚀 Vérifie la sédimentation Neo4j
    expect(mockNeo4jRun).toHaveBeenCalledTimes(1);
    expect(mockNeo4jRun).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (buyer)-[r:TRANSACTED_WITH {currency: $currency}]->(seller)'),
      expect.objectContaining({
        fromUid: 'client_88',
        toUid: 'marchand_1',
        currency: 'EUR',
        amountCents: 1200
      })
    );
  });
});
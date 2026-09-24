// packages/infrastructure/src/database/models/__test__/nosql/ledgerEntry.model.test.ts

import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { LedgerEntryModel } from '../../nosql/ledgerEntry.model';

describe('LedgerEntry Model Test - Extension ERP & Fiscalité', () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/ilotzoizos_test';
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    await LedgerEntryModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('doit créer et persister une écriture comptable complète avec ventilation fiscale', async () => {
    const validEntry = new LedgerEntryModel({
      entryUid: 'ledger_001',
      ownerUid: 'marchand_1',
      counterpartyUid: 'client_88',
      counterpartyPseudo: 'OiseauLibre',
      amountCents: 1200,      // 12.00 € TTC
      amountHTCents: 1000,    // 10.00 € HT
      taxCents: 200,          // 2.00 € TVA
      feeCents: 50,           // 0.50 € Frais Stripe
      currency: 'EUR',
      type: 'CREDIT',
      category: 'STORE_SALE',
      referenceUid: 'ref_123',
      orderUid: 'order_999',
      invoiceUid: 'inv_001',
      description: 'Vente Artefact',
      entryHash: 'hash_sha256_mock_123'
    });

    const savedEntry = await validEntry.save();

    expect(savedEntry._id).toBeDefined();
    expect(savedEntry.entryUid).toBe('ledger_001');
    expect(savedEntry.amountHTCents).toBe(1000);
    expect(savedEntry.taxCents).toBe(200);
    expect(savedEntry.counterpartyPseudo).toBe('OiseauLibre');
    expect(savedEntry.orderUid).toBe('order_999');
    expect(savedEntry.createdAt).toBeDefined();
  });

  it('doit échouer si un champ requis est manquant (ex: amountCents ou entryHash)', async () => {
    const invalidEntry = new LedgerEntryModel({
      entryUid: 'ledger_002',
      ownerUid: 'marchand_1',
      counterpartyUid: 'client_88',
      // amountCents intentionnellement omis
      currency: 'EUR',
      type: 'CREDIT',
      category: 'STORE_SALE',
      referenceUid: 'ref_124',
      description: 'Vente sans montant',
      // entryHash intentionnellement omis
    });

    let error: any;
    try {
      await invalidEntry.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.amountCents).toBeDefined();
    expect(error.errors.entryHash).toBeDefined();
  });

  it('doit échouer si le type ou la catégorie fournit des valeurs hors de l\'énumération', async () => {
    const invalidCategoryEntry = new LedgerEntryModel({
      entryUid: 'ledger_003',
      ownerUid: 'marchand_1',
      counterpartyUid: 'client_88',
      amountCents: 500,
      currency: 'EUR',
      type: 'INVALID_TYPE' as any, // Type hors Enum
      category: 'INVALID_CATEGORY' as any, // Catégorie hors Enum
      referenceUid: 'ref_125',
      description: 'Erreur de type strict',
      entryHash: 'hash_456'
    });

    let error: any;
    try {
      await invalidCategoryEntry.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.type).toBeDefined();
    expect(error.errors.category).toBeDefined();
  });
});
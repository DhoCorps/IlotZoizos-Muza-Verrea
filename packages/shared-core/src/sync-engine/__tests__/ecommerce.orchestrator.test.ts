import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceOrchestrator } from '../ecommerce.orchestrator';
import { TransactionManager } from '../transactionManager';
import { ProductModel } from '@ilot/infrastructure';

// 🚀 MOCKS SÉCURISÉS ET COMPLETS
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    ProductModel: {
      create: vi.fn(),
      deleteOne: vi.fn(),
    },
    StoreModel: {
      deleteOne: vi.fn(),
    },
    RouletteModel: {
      findOne: vi.fn(),
      insertMany: vi.fn(),
    }
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-session', { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_data' }] }) })),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  safeSyncUniversalInteraction: vi.fn().mockResolvedValue(true),
}));

// 🚀 MOCK DU COPYRIGHT ENGINE
vi.mock('../utils/copyright.engine', () => ({
  sanitizeCopyright: vi.fn((meta) => {
    if (!meta) return { role: 'CREATOR', isExclusiveIlot: false };
    if (meta.role === 'CURATOR') return { ...meta, isExclusiveIlot: false };
    return meta;
  }),
  getCopyrightCypherRelation: vi.fn((role) => {
    if (role === 'SUBLIMATOR') return 'SUBLIMATES';
    if (role === 'CURATOR') return 'CURATES';
    return 'CREATED';
  })
}));

describe('EcommerceOrchestrator - Boutique, SEO & Copyright DRY', () => {
  let orchestrator: EcommerceOrchestrator;
  const adminSignature = { actorUid: 'bird_admin', capabilities: ['*'] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new EcommerceOrchestrator();
  });

  describe('createProduct (Bordel de DhÖ)', () => {
    it('🟢 doit créer un produit avec un prix strict en centimes (priceCents) et générer le SEO auto', async () => {
      
      vi.mocked(ProductModel.create).mockResolvedValueOnce([{ toObject: () => ({}) }] as any);

      const payload = {
        uid: 'prod_1',
        storeUid: 'store_1',
        title: 'Artefact Sonore',
        description: 'Un magnifique artefact pour vos oreilles',
        priceCents: 2500, // 25.00 €
      };

      const result = await orchestrator.createProduct(payload, adminSignature as any);
      
      expect(result.success).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // On vérifie que la base Mongoose a bien reçu les données SEO auto-générées
      const mongoCallArg = vi.mocked(ProductModel.create).mock.calls[0][0];
      expect((mongoCallArg as any)[0].seoMetadata.title).toBe('Artefact Sonore | Artefact');
      expect((mongoCallArg as any)[0].seoMetadata.description).toBe('Un magnifique artefact pour vos oreilles');
    });

    it('🟢 doit injecter la bonne relation Neo4j et préserver l\'exclusivité pour un SUBLIMATOR', async () => {
      
      vi.mocked(ProductModel.create).mockResolvedValueOnce([{ toObject: () => ({}) }] as any);

      const payload = {
        uid: 'prod_2',
        storeUid: 'store_1',
        title: 'Oeuvre Sublimée',
        priceCents: 5000,
        // 🚀 CORRECTION TS : "as const" permet de figer le type litéral au lieu d'un 'string' générique
        copyrightMetadata: { role: 'SUBLIMATOR' as const, isExclusiveIlot: true }
      };

      const result = await orchestrator.createProduct(payload, adminSignature as any);
      
      expect(result.success).toBe(true);

      const mongoCallArg = vi.mocked(ProductModel.create).mock.calls[0][0];
      expect((mongoCallArg as any)[0].copyrightMetadata.role).toBe('SUBLIMATOR');
      expect((mongoCallArg as any)[0].copyrightMetadata.isExclusiveIlot).toBe(true);
    });

    it('🟢 doit briser l\'exclusivité Îlot si le rôle est CURATOR (Sécurité DRY)', async () => {
      
      vi.mocked(ProductModel.create).mockResolvedValueOnce([{ toObject: () => ({}) }] as any);

      const payload = {
        uid: 'prod_3',
        storeUid: 'store_1',
        title: 'Oeuvre Relayée',
        priceCents: 1000,
        // 🚀 CORRECTION TS : "as const" ici aussi
        copyrightMetadata: { role: 'CURATOR' as const, isExclusiveIlot: true } // Demande abusive
      };

      const result = await orchestrator.createProduct(payload, adminSignature as any);
      
      expect(result.success).toBe(true);

      const mongoCallArg = vi.mocked(ProductModel.create).mock.calls[0][0];
      expect((mongoCallArg as any)[0].copyrightMetadata.role).toBe('CURATOR');
      expect((mongoCallArg as any)[0].copyrightMetadata.isExclusiveIlot).toBe(false); // La sécurité a agi !
    });
  });
});
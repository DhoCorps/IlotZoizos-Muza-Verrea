// Fichier : packages/shared-core/src/sync-engine/__tests__/bibliotek.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliotekOrchestrator } from '../bibliotek.orchestrator';
import { LibraryBookModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import type { ActionSignature } from '@ilot/types';

// 1. Mock de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    LibraryBookModel: {
      findOne: vi.fn(),
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

// 2. Mock du Transaction Manager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

// 3. Mock robuste du Copyright Engine
vi.mock('../../utils/copyright.engine', () => ({
  sanitizeCopyright: vi.fn((meta) => {
    if (meta && meta.filiation) return { ...meta, filiation: meta.filiation };
    if (!meta) return { role: 'CREATOR', isExclusiveIlot: false };
    if (meta.role === 'CURATOR') return { ...meta, isExclusiveIlot: false };
    return meta;
  }),
  getCopyrightCypherRelation: vi.fn((role) => {
    if (role === 'SUBLIMATOR') return 'SUBLIMATES';
    if (role === 'CURATOR') return 'CURATES';
    return 'CREATED';
  }),
  generateFileHash: vi.fn(() => 'mock_sha256_hash')
}));

describe('BibliotekOrchestrator - Scriptorium, Économie, Filiation & Copyright DRY', () => {
  let orchestrator: BibliotekOrchestrator;
  let mockFosterNotification: any;
  let mockNeo4jRun: any;

  const userSignature: ActionSignature = { actorUid: 'oiseau-writer', capabilities: [] };
  const strangerSignature: ActionSignature = { actorUid: 'oiseau-intruder', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url: string) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 🛡️ Création des mocks localement, totalement protégés des bugs de hissage
    mockFosterNotification = vi.fn().mockResolvedValue({ success: true });
    mockNeo4jRun = vi.fn().mockResolvedValue({ 
      records: [{ get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'mock_node' }] 
    });

    vi.mocked(TransactionManager.execute).mockImplementation(async (_name, callback) => {
      const mockMongoSession = {} as any;
      const mockNeo4jTx = { run: mockNeo4jRun }; 
      return await callback(mockMongoSession, mockNeo4jTx as any);
    });

    // 💉 Injection de dépendance pure
    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any; 

    orchestrator = new BibliotekOrchestrator(mockStorageManager, injectedNotificationOrchestrator);
  });

  describe('fosterBook (Création, Copyright, Filiation & Gestion des Brouillons)', () => {
    it('🔴 devrait rejeter la publication si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-writer', title: 'Mon Roman', fileUrl: 'cdn://epub' };
      await expect(orchestrator.fosterBook(data, strangerSignature)).rejects.toThrow(IlotError);
    });

    it('🟢 devrait fonder un ouvrage en DRAFT sans déclencher d\'alerte publique, et générer le SEO', async () => {
      const data = { 
        title: 'Brouillon d\'Essai', 
        authorUid: 'oiseau-writer', 
        status: 'DRAFT' as const,
        fileUrl: 'https://cdn.ilot/books/draft.epub',
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(result.mongo.status).toBe('DRAFT');
      expect(result.mongo.digitalSignature).toBe('mock_sha256_hash');
      expect(mockFosterNotification).toHaveBeenCalledTimes(0);
    });

    it('🟢 devrait fonder un ouvrage avec le rôle SUBLIMATOR et badge d\'Exclusivité', async () => {
      const data = { 
        title: 'Traité Sublimé', 
        authorUid: 'oiseau-writer', 
        status: 'PUBLISHED' as const, 
        fileUrl: 'https://cdn.ilot/books/traite.epub',
        copyrightMetadata: {
          role: 'SUBLIMATOR' as const,
          originalAuthor: 'Vieux Maître',
          isExclusiveIlot: true
        }
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            title: expect.stringContaining('Exclusivité Îlot')
          })
        }),
        userSignature
      );
    });

    it('🟢 devrait fonder un ouvrage avec le Pacte de Filiation et des Tags', async () => {
      const data = { 
        title: 'Œuvre Dérivée', 
        authorUid: 'oiseau-writer', 
        status: 'PUBLISHED' as const, 
        fileUrl: 'https://cdn.ilot/books/derive.epub',
        tags: ['cyberpunk', 'filiation'],
        copyrightMetadata: {
          role: 'SUBLIMATOR' as const,
          isExclusiveIlot: false,
          filiation: {
            isExternalSource: true,
            sourceAuthorName: 'Auteur Source',
            sourceWorkTitle: 'Le Mythe',
            claimStatus: 'PENDING_CLAIM' as const,
            escrowBalance: 0
          }
        }
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(mockNeo4jRun).toHaveBeenCalledWith(
        expect.stringContaining('filiationClaimStatus: $filiationClaimStatus'),
        expect.objectContaining({
          hasFiliation: true,
          filiationClaimStatus: 'PENDING_CLAIM',
          digitalSignature: 'mock_sha256_hash'
        })
      );
    });

    it('🟢 devrait automatiquement désactiver l\'Exclusivité Îlot si le rôle est un simple CURATOR', async () => {
      const data = { 
        title: 'Livre Relayé', 
        authorUid: 'oiseau-writer', 
        fileUrl: 'https://cdn.ilot/books/livre.epub',
        copyrightMetadata: { role: 'CURATOR' as const, isExclusiveIlot: true } 
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        expect(docs[0].copyrightMetadata.isExclusiveIlot).toBe(false);
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      await orchestrator.fosterBook(data, userSignature);
    });
  });
});
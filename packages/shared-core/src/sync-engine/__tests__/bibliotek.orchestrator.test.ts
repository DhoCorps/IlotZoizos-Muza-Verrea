// Fichier : packages/shared-core/src/sync-engine/__tests__/bibliotek.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliotekOrchestrator } from '../bibliotek.orchestrator';
import { LibraryBookModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import type { ActionSignature } from '@ilot/types';

// 🚀 1. Utilisation de vi.hoisted pour survivre au hissage de Vitest
const { mockFosterNotification, mockNeo4jRun, mockSanitizeCopyright } = vi.hoisted(() => {
  return {
    mockFosterNotification: vi.fn().mockResolvedValue({ success: true }),
    mockNeo4jRun: vi.fn().mockResolvedValue({ 
      records: [{ get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'mock_node' }] 
    }),
    mockSanitizeCopyright: vi.fn((meta) => {
      // Garantit que le Pacte de Filiation traverse le mock intact
      if (meta && meta.filiation) return { ...meta, filiation: meta.filiation };
      if (!meta) return { role: 'CREATOR', isExclusiveIlot: false };
      if (meta.role === 'CURATOR') return { ...meta, isExclusiveIlot: false };
      return meta;
    })
  };
});

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

vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

// 🚀 2. Injection du TransactionManager avec "as any" pour bypasser l'erreur TS ClientSession
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {} as any; // 👈 Calm down TypeScript
      const mockNeo4jTx = { run: mockNeo4jRun }; 
      return await callback(mockMongoSession, mockNeo4jTx as any);
    }),
  },
}));

// 🚀 3. Mock robuste du Copyright Engine (CORRECTION DU CHEMIN : ../../utils au lieu de ../utils)
vi.mock('../../utils/copyright.engine', () => ({
  sanitizeCopyright: mockSanitizeCopyright,
  getCopyrightCypherRelation: vi.fn((role) => {
    if (role === 'SUBLIMATOR') return 'SUBLIMATES';
    if (role === 'CURATOR') return 'CURATES';
    return 'CREATED';
  }),
  generateFileHash: vi.fn(() => 'mock_sha256_hash')
}));

describe('BibliotekOrchestrator - Scriptorium, Émotions, Économie, Filiation & Copyright DRY', () => {
  let orchestrator: BibliotekOrchestrator;
  const userSignature: ActionSignature = { actorUid: 'oiseau-writer', capabilities: [] };
  const strangerSignature: ActionSignature = { actorUid: 'oiseau-intruder', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url: string) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFosterNotification.mockClear();
    mockNeo4jRun.mockClear();

    // Reset du comportement par défaut de Neo4j
    mockNeo4jRun.mockResolvedValue({ 
      records: [{ get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'mock_node' }] 
    });

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

      // 🚀 Renvoyer l'objet généré dynamiquement pour ne pas perdre les variables
      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(result.mongo.status).toBe('DRAFT');
      expect(result.mongo.digitalSignature).toBe('mock_sha256_hash'); // Le mock agit enfin !
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
      
      // 🚀 Vérification que la Filiation a bien été passée au Graphe Neo4j
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
        copyrightMetadata: { role: 'CURATOR' as const, isExclusiveIlot: true } // Abusif
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        expect(docs[0].copyrightMetadata.isExclusiveIlot).toBe(false); // La sécurité DRY agit !
        return [{ ...docs[0], toObject: () => docs[0] }] as any;
      });

      await orchestrator.fosterBook(data, userSignature);
    });
  });

  describe('toggleScholarSeal (Notes d\'Érudits & Reconnaissance)', () => {
    it('🟢 devrait permettre à l\'auteur d\'apposer le Sceau et envoyer une notification au lecteur', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer', slug: 'my-book' } as any);
      
      const mockUpdatedBook = {
        uid: 'book-999',
        slug: 'my-book',
        emotionalHighlights: [{ uid: 'emo-uid', readerUid: 'bird_reader_1', isScholarSealed: true }]
      };
      
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({ 
        lean: vi.fn().mockResolvedValue(mockUpdatedBook) 
      } as any);

      const result = await orchestrator.toggleScholarSeal('book-999', 'emo-uid', true, userSignature);

      expect(result.success).toBe(true);
      expect(result.isScholarSealed).toBe(true);
      
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUid: 'bird_reader_1',
          type: 'SCHOLAR_SEAL_AWARDED'
        }),
        expect.anything()
      );
    });
  });
});
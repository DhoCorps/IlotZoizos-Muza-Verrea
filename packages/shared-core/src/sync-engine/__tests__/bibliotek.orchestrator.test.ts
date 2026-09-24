import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliotekOrchestrator } from '../bibliotek.orchestrator';
import { LibraryBookModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import type { ActionSignature } from '@ilot/types';

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

const mockFosterNotification = vi.fn().mockResolvedValue({ success: true });
vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { 
        run: vi.fn().mockResolvedValue({ 
          records: [{ get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'mock_node' }] 
        }) 
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

// 🚀 MOCK du Copyright Engine pour isoler les tests
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

describe('BibliotekOrchestrator - Scriptorium, Émotions, Économie & Copyright DRY', () => {
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

    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any; 

    orchestrator = new BibliotekOrchestrator(mockStorageManager, injectedNotificationOrchestrator);
  });

  describe('fosterBook (Création, Copyright & Gestion des Brouillons)', () => {
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

      vi.mocked(LibraryBookModel.create).mockResolvedValue([{ 
        uid: 'book-draft', title: 'Brouillon d\'Essai', status: 'DRAFT',
        toObject: () => ({ uid: 'book-draft', title: 'Brouillon d\'Essai', status: 'DRAFT' })
      }] as any);

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(result.mongo.status).toBe('DRAFT');
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

      vi.mocked(LibraryBookModel.create).mockResolvedValue([{ 
        uid: 'book-999', title: 'Traité Sublimé', status: 'PUBLISHED',
        toObject: () => ({ uid: 'book-999', title: 'Traité Sublimé', status: 'PUBLISHED' })
      }] as any);

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      // Vérifie que le badge "Exclusivité" est bien injecté dans la notification système
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            title: expect.stringContaining('Exclusivité Îlot')
          })
        }),
        userSignature
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

      // 🚀 Correction du mock `as any` pour satisfaire TypeScript
      vi.mocked(LibraryBookModel.create).mockImplementation(async (docs: any) => {
        expect(docs[0].copyrightMetadata.isExclusiveIlot).toBe(false); // La sécurité DRY agit !
        return [{ uid: 'book-curator', toObject: () => docs[0] }] as any;
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
      // Vérifie que la notification "Sceau d'érudit" part vers le lecteur
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
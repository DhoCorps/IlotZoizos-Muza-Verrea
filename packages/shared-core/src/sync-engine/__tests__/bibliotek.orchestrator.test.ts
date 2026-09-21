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

describe('BibliotekOrchestrator - Scriptorium, Émotions & Économie', () => {
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

  describe('fosterBook (Création & Gestion des Brouillons)', () => {
    it('devrait rejeter la publication si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-writer', title: 'Mon Roman', fileUrl: 'cdn://epub' };
      await expect(orchestrator.fosterBook(data, strangerSignature)).rejects.toThrow(IlotError);
    });

    it('🟢 devrait fonder un ouvrage en DRAFT sans déclencher d\'alerte publique', async () => {
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

    it('🟢 devrait fonder un ouvrage en PUBLISHED et envoyer un écho aux abonnés', async () => {
      const data = { 
        title: 'Traité de Philosophie', authorUid: 'oiseau-writer', status: 'PUBLISHED' as const, fileUrl: 'https://cdn.ilot/books/traite.epub',
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
      } as any);

      vi.mocked(LibraryBookModel.create).mockResolvedValue([{ 
        uid: 'book-999', title: 'Traité de Philosophie', status: 'PUBLISHED',
        toObject: () => ({ uid: 'book-999', title: 'Traité de Philosophie', status: 'PUBLISHED' })
      }] as any);

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBook (Publication de Brouillon)', () => {
    it('🟢 devrait déclencher un écho NEW_BOOK lors de la transition de DRAFT vers PUBLISHED', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer', status: 'DRAFT' } as any);
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'book-999', title: 'Nouveau Titre', status: 'PUBLISHED' })
      } as any);

      await orchestrator.updateBook('book-slug', { status: 'PUBLISHED' }, userSignature);

      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('addEmotionalHighlight (Surlignage Émotionnel)', () => {
    it('🟢 devrait ajouter une fulgurance à l\'ouvrage et alerter l\'auteur', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer', slug: 'mon-livre' } as any);
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'book-999', emotionalHighlights: [{ emotion: '<(:<' }] })
      } as any);

      const payload = { selectedText: 'Le feu danse...', emotion: '<(:<', comment: 'Brillant !' };
      const result = await orchestrator.addEmotionalHighlight('book-999', payload, { actorUid: 'oiseau-reader', capabilities: [] });

      expect(result.success).toBe(true);
      expect(result.highlight.emotion).toBe('<(:<');
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleScholarSeal (Notes d\'Érudits)', () => {
    it('🟢 devrait permettre à l\'auteur d\'apposer le Sceau', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer' } as any);
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 'book-999' }) } as any);

      const result = await orchestrator.toggleScholarSeal('book-999', 'emo-uid', true, userSignature);

      expect(result.success).toBe(true);
      expect(result.isScholarSealed).toBe(true);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliotekOrchestrator } from '../bibliotek.orchestrator';
import { LibraryBookModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import type { ActionSignature } from '@ilot/types';

// ==========================================
// MOCKS (Infrastructure & Canopée)
// ==========================================
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

// 🌿 On mock le cerveau de la Canopée Tampon
const mockFosterNotification = vi.fn().mockResolvedValue({ success: true });
vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

// On injecte le tableau "followerUids" dans le retour Neo4j
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { 
        run: vi.fn().mockResolvedValue({ 
          records: [{ 
            get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'mock_node' 
          }] 
        }) 
      };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('BibliotekOrchestrator - Sanctuaire, Sceau SHA-256 & Économie Barter', () => {
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

    // 🌿 Injection explicite du NotificationOrchestrator mocké
    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any; 

    orchestrator = new BibliotekOrchestrator(mockStorageManager, injectedNotificationOrchestrator);
  });

  describe('fosterBook (Création avec métadonnées d\'économie Barter/Gacha)', () => {
    it('devrait rejeter la publication si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-writer', title: 'Mon Roman', fileUrl: 'cdn://epub' };
      await expect(orchestrator.fosterBook(data, strangerSignature))
        .rejects.toThrow(IlotError);
    });

    it('devrait rejeter si le titre ou l\'URL du fichier source est manquant', async () => {
      const data = { authorUid: 'oiseau-writer', title: '' };
      // @ts-ignore
      await expect(orchestrator.fosterBook(data, userSignature))
        .rejects.toThrow(IlotError);
    });

    it('🟢 devrait fonder un ouvrage, intégrer l\'économie Gacha/Barter, et envoyer un écho aux abonnés', async () => {
      const data = { 
        title: 'Traité de Philosophie Sauvage', 
        authorUid: 'oiseau-writer', 
        writingType: 'essai',
        style: 'philosophie',
        fileUrl: 'https://cdn.ilot/books/traite.epub',
        economy: {
          priceCents: 1500,
          gachaTier: 'epic' as const
        }
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null)
        })
      } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

      vi.mocked(LibraryBookModel.create).mockResolvedValue([{ 
        uid: 'book-999', 
        title: 'Traité de Philosophie Sauvage', 
        slug: 'traite-de-philosophie-sauvage',
        digitalSignature: 'mocked_hash',
        economy: { priceCents: 1500, gachaTier: 'epic', barterAllowed: true },
        toObject: () => ({
          uid: 'book-999', 
          title: 'Traité de Philosophie Sauvage', 
          slug: 'traite-de-philosophie-sauvage',
          digitalSignature: 'mocked_hash',
          economy: { priceCents: 1500, gachaTier: 'epic', barterAllowed: true }
        })
      }] as unknown as Awaited<ReturnType<typeof LibraryBookModel.create>>);

      const result = await orchestrator.fosterBook(data, userSignature);

      expect(result.success).toBe(true);
      // @ts-ignore
      expect(result.mongo.uid).toBe('book-999');
      // @ts-ignore
      expect(result.mongo.economy.priceCents).toBe(1500);
      // @ts-ignore
      expect(result.mongo.economy.gachaTier).toBe('epic');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // 🌿 Vérification de la notification dans la Canopée
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ 
          recipientUid: 'bird_follower_1', 
          type: 'NEW_BOOK' 
        }), 
        userSignature
      );
    });
  });

  describe('updateBook (Mutation & Canopée)', () => {
    it('devrait rejeter si l\'ouvrage n\'existe pas dans la Silice', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue(null);
      await expect(orchestrator.updateBook('inconnu', {}, userSignature))
        .rejects.toThrow(/Ouvrage introuvable dans la Silice/);
    });

    it('devrait rejeter si l\'oiseau n\'est pas l\'auteur (Usurpation)', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ authorUid: 'autre-oiseau' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);
      await expect(orchestrator.updateBook('book-999', {}, userSignature))
        .rejects.toThrow(/Tu ne peux modifier que tes propres ouvrages/);
    });

    it('🟢 devrait mettre à jour l\'ouvrage et prévenir les abonnés', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'book-999', title: 'Nouveau Titre' })
      } as unknown as ReturnType<typeof LibraryBookModel.findOneAndUpdate>);

      const result = await orchestrator.updateBook(
        'book-slug', 
        { title: 'Nouveau Titre' }, 
        userSignature
      );

      expect(result.success).toBe(true);
      // @ts-ignore
      expect(result.mongo.title).toBe('Nouveau Titre');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // 🌿 L'Écho d'update a été envoyé !
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UPDATED_BOOK' }), 
        userSignature
      );
    });
  });

  describe('disintegrateBook (Suppression)', () => {
    it('devrait supprimer les fichiers du stockage physique et retourner un succès', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValue({ 
        uid: 'book-999', 
        authorUid: 'oiseau-writer',
        fileUrl: 'https://cdn.ilot/book.epub',
        coverUrl: 'https://cdn.ilot/cover.jpg'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const result = await orchestrator.disintegrateBook('book-999', userSignature);

      expect(result.success).toBe(true);
      expect(result.purgedCount).toBe(1);
      
      expect(mockStorageManager.extractKeyFromUrl).toHaveBeenCalledTimes(2);
      expect(mockStorageManager.deleteFile).toHaveBeenCalledTimes(2);
      expect(LibraryBookModel.deleteOne).toHaveBeenCalled();
    });
  });
});
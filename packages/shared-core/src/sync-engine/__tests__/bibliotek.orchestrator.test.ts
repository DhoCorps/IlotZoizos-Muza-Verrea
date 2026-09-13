// packages/shared-core/src/sync-engine/__tests__/bibliotek.orchestrator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BibliotekOrchestrator } from '../bibliotek.orchestrator';
import { LibraryBookModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

vi.mock('@ilot/infrastructure', () => ({
  LibraryBookModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (name, callback) => {
      const mockMongoSession = {};
      const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [{ get: () => 'mock_node' }] }) };
      return await callback(mockMongoSession, mockNeo4jTx);
    }),
  },
}));

describe('BibliotekOrchestrator - Sanctuaire des Écrits Libres & Sceau SHA-256', () => {
  let orchestrator: BibliotekOrchestrator;
  const userSignature = { actorUid: 'oiseau-writer', capabilities: [] };
  const strangerSignature = { actorUid: 'oiseau-intruder', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new BibliotekOrchestrator();
  });

  describe('fosterBook (Création & Sceau d\'antériorité)', () => {
    it('devrait rejeter la publication si l\'oiseau usurpe une identité', async () => {
      const data = { authorUid: 'oiseau-writer', title: 'Mon Roman', fileUrl: 'cdn:// epub' };
      await expect(orchestrator.fosterBook(data, strangerSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('devrait rejeter si le titre ou l\'URL du fichier source est manquant', async () => {
      const data = { authorUid: 'oiseau-writer', title: '' };
      await expect(orchestrator.fosterBook(data, userSignature as any))
        .rejects.toThrow(IlotError);
    });

    it('devrait fonder un ouvrage, forger le Sceau SHA-256 et l\'insérer dans Mongo et Neo4j', async () => {
      const data = { 
        title: 'Traité de Philosophie Sauvage', 
        authorUid: 'oiseau-writer', 
        writingType: 'essai',
        style: 'philosophie',
        fileUrl: 'https://cdn.ilot/books/traite.epub' 
      };

      vi.mocked(LibraryBookModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(LibraryBookModel.create).mockResolvedValue([{ 
        uid: 'book-999', 
        title: 'Traité de Philosophie Sauvage', 
        slug: 'traite-de-philosophie-sauvage',
        digitalSignature: 'mocked_hash'
      }] as any);

      const result = await orchestrator.fosterBook(data, userSignature as any);

      expect(result.success).toBe(true);
      expect(result.mongo.uid).toBe('book-999');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBook (Mutation)', () => {
    it('devrait rejeter si l\'ouvrage n\'existe pas dans la Silice', async () => {
      vi.mocked(LibraryBookModel.findOne).mockResolvedValue(null);
      await expect(orchestrator.updateBook('inconnu', {}, userSignature as any))
        .rejects.toThrow(/introuvable dans la Silice/);
    });

    it('devrait rejeter si l\'oiseau n\'est pas l\'auteur (Usurpation)', async () => {
      vi.mocked(LibraryBookModel.findOne).mockResolvedValue({ authorUid: 'autre-oiseau' } as any);
      await expect(orchestrator.updateBook('book-999', {}, userSignature as any))
        .rejects.toThrow(/Tu ne peux modifier que tes propres ouvrages/);
    });

    it('devrait mettre à jour l\'ouvrage avec succès', async () => {
      vi.mocked(LibraryBookModel.findOne).mockResolvedValue({ uid: 'book-999', authorUid: 'oiseau-writer' } as any);
      vi.mocked(LibraryBookModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'book-999', title: 'Nouveau Titre' })
      } as any);

      const result = await orchestrator.updateBook(
        'book-slug', 
        { title: 'Nouveau Titre' }, 
        userSignature as any
      );

      expect(result.success).toBe(true);
      expect(result.mongo.title).toBe('Nouveau Titre');
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('disintegrateBook (Suppression)', () => {
    it('devrait retourner les URLs des fichiers à purger au stockage', async () => {
      vi.mocked(LibraryBookModel.findOne).mockResolvedValue({ 
        uid: 'book-999', 
        authorUid: 'oiseau-writer',
        fileUrl: 'https://cdn.ilot/book.epub',
        coverUrl: 'https://cdn.ilot/cover.jpg'
      } as any);

      const result = await orchestrator.disintegrateBook('book-999', userSignature as any);

      expect(result.success).toBe(true);
      expect(result.filesToDelete).toHaveLength(2);
      expect(result.filesToDelete).toContain('https://cdn.ilot/book.epub');
      expect(LibraryBookModel.deleteOne).toHaveBeenCalled();
    });
  });
});
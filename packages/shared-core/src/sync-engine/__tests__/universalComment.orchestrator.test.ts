import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversalCommentOrchestrator } from '../universalComment.orchestrator';
import { UniversalCommentModel, SujetModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// ==========================================
// MOCKS INCHIFFRÉS
// ==========================================
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    UniversalCommentModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    SujetModel: {
      findOne: vi.fn(),
    },
  };
});

vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(),
  },
}));

// ==========================================
// TESTS : UNIVERSAL COMMENT ORCHESTRATOR
// ==========================================
describe('UniversalCommentOrchestrator - Le Moteur de Résonance', () => {
  let orchestrator: UniversalCommentOrchestrator;
  const userSignature = { actorUid: 'oiseau_123', capabilities: [] };

  let mockMongoSession: any;
  let mockNeo4jTx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new UniversalCommentOrchestrator();
    
    mockMongoSession = {};
    mockNeo4jTx = { run: vi.fn() };

    // On permet au mock du TransactionManager d'exécuter directement la callback
    // avec nos mocks contrôlables pour vérifier le comportement interne
    vi.mocked(TransactionManager.execute).mockImplementation(async (_name, cb) => {
      return cb(mockMongoSession, mockNeo4jTx);
    });
  });

  describe('fosterComment (Création & Gacha)', () => {
    
    const basePayload = {
      targetUid: 'oeuvre_456',
      targetType: 'BLOG' as const,
      content: 'Un chef-d\'œuvre absolu.',
    };

    it('🔴 doit rejeter (403) si l\'Oiseau n\'a émis AUCUNE réaction sur l\'œuvre (Pas d\'amour = pas de parole)', async () => {
      // On simule que la requête Neo4j "MATCH ... [:REACTED_TO]" ne trouve rien (length: 0)
      mockNeo4jTx.run.mockResolvedValueOnce({ records: [] });

      await expect(
        orchestrator.fosterComment(basePayload, userSignature as any)
      ).rejects.toThrow(IlotError);
      
      // On s'assure que MongoDB n'a jamais été appelé
      expect(UniversalCommentModel.create).not.toHaveBeenCalled();
    });

    it('🟢 doit accepter le commentaire, le créer, et incrémenter le Gacha SANS déclencher le Jackpot', async () => {
      // 1. Simule la présence de la réaction
      mockNeo4jTx.run.mockResolvedValueOnce({ records: [{}] }); // La lecture
      mockNeo4jTx.run.mockResolvedValueOnce({ records: [{}] }); // L'écriture
      
      // 2. Simule la création du commentaire dans Mongo
      vi.mocked(UniversalCommentModel.create).mockResolvedValueOnce([{ uid: 'comment_789', content: 'Un chef-d\'œuvre absolu.' }] as any);

      // 3. Simule l'œuvre cible (Sujet) avec un compteur Loin du but
      const mockSujet = {
        uid: 'oeuvre_456',
        kosmicBoon: { interactionCount: 10, nextKosmicBoon: 42 },
        save: vi.fn()
      };
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockSujet)
      } as any);

      const res = await orchestrator.fosterComment(basePayload, userSignature as any);

      expect(res.success).toBe(true);
      expect(res.isJackpot).toBe(false); // Pas de jackpot
      expect(mockSujet.kosmicBoon.interactionCount).toBe(11); // Incrémenté
      expect(mockSujet.save).toHaveBeenCalled();
    });

    it('🟢 🌟 doit accepter le commentaire et DÉCLENCHER LE JACKPOT (Kosmic Boon)', async () => {
      mockNeo4jTx.run.mockResolvedValue({ records: [{}] });
      vi.mocked(UniversalCommentModel.create).mockResolvedValueOnce([{ uid: 'comment_789' }] as any);

      // 3. Simule l'œuvre cible avec un compteur qui ATTEINT le seuil (41 + 1 = 42)
      const mockSujet = {
        uid: 'oeuvre_456',
        kosmicBoon: { interactionCount: 41, nextKosmicBoon: 42 },
        save: vi.fn()
      };
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockSujet)
      } as any);

      const res = await orchestrator.fosterComment(basePayload, userSignature as any);

      expect(res.success).toBe(true);
      expect(res.isJackpot).toBe(true); // 🌟 BINGO !
      expect(mockSujet.kosmicBoon.interactionCount).toBe(42);
      expect(mockSujet.kosmicBoon.nextKosmicBoon).toBeGreaterThan(42); // Le nouveau seuil a été calculé aléatoirement
    });
  });

  describe('occultComment (Invisibilité Kosmique)', () => {
    it('🔴 doit rejeter si l\'utilisateur n\'est pas l\'auteur du commentaire', async () => {
      vi.mocked(UniversalCommentModel.findOne).mockResolvedValueOnce({ authorUid: 'autre_oiseau' });

      await expect(
        orchestrator.occultComment('comment_1', userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit masquer le commentaire avec succès en passant isHidden à true', async () => {
      vi.mocked(UniversalCommentModel.findOne).mockResolvedValueOnce({ authorUid: 'oiseau_123' });
      vi.mocked(UniversalCommentModel.findOneAndUpdate).mockResolvedValueOnce({} as any);

      const res = await orchestrator.occultComment('comment_1', userSignature as any);
      expect(res.success).toBe(true);
      expect(UniversalCommentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { uid: 'comment_1' },
        { $set: { isHidden: true } }
      );
    });
  });
});
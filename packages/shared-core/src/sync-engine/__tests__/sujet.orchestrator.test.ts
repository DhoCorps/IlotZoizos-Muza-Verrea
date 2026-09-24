import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SujetOrchestrator } from '../sujet.orchestrator';
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// ==========================================
// MOCKS (Inchiffrés et Sécurisés)
// ==========================================
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SujetModel: {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

// 🌿 On mock le chef d'orchestre des notifications
const mockFosterNotification = vi.fn().mockResolvedValue({ success: true });
vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

// On simule la transaction qui renvoie notre Noeud et la liste des abonnés (followerUids)
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => cb('mock-mongo-session', { 
      run: vi.fn().mockResolvedValue({ 
        records: [{ 
          get: (key: string) => key === 'followerUids' ? ['bird_follower_1'] : 'node_mock' 
        }] 
      }) 
    })),
  },
}));

// MOCK du Copyright Engine pour isoler les tests
vi.mock('../utils/copyright.engine', () => ({
  sanitizeCopyright: vi.fn((meta) => {
    // Reproduction simplifiée du comportement métier pour les tests d'intégration
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

// ==========================================
// TESTS : SUJET ORCHESTRATOR
// ==========================================
describe('SujetOrchestrator - Atelier de Pensée (Monologues, SEO & Copyright)', () => {
  let orchestrator: SujetOrchestrator;
  const adminSignature = { actorUid: 'admin_1', capabilities: ['*'] };
  const userSignature = { actorUid: 'bird_author', capabilities: [] };

  const mockStorageManager = {
    extractKeyFromUrl: vi.fn((url) => `key_${url}`),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFosterNotification.mockClear();

    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any; 

    orchestrator = new SujetOrchestrator(mockStorageManager, injectedNotificationOrchestrator);
  });

  describe('fosterSujet', () => {
    it('🔴 doit rejeter (403) si l\'Oiseau n\'est pas l\'auteur et n\'a pas la capacité root', async () => {
      await expect(
        orchestrator.fosterSujet({ authorUid: 'other_bird', title: 'Test', content: 'Test' } as any, userSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit forger un sujet, générer l\'excerpt auto, tisser Neo4j et envoyer un écho', async () => {
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValueOnce(null)
        })
      } as any);

      const longContent = "A".repeat(200);

      vi.mocked(SujetModel.create).mockResolvedValueOnce([
        { 
          toObject: () => ({
            uid: 'sujet_1', 
            title: 'Pensée Silencieuse', 
            slug: 'pensee-silencieuse', 
            authorUid: 'bird_author', 
            excerpt: "A".repeat(147) + '...', // Vérifie l'excerpt auto
            status: 'PUBLISHED',
            settings: { allowPropagation: true },
            propagation: { shareCount: 0, uniquePasseurs: 0, globalReach: 0 },
            kosmicBoon: { interactionCount: 0, nextKosmicBoon: 42 } 
          })
        }
      ] as any);

      const res = await orchestrator.fosterSujet({ 
        title: 'Pensée Silencieuse', 
        content: longContent,
        authorUid: 'bird_author', 
        status: 'PUBLISHED',
        connections: { crossLinks: [{ entityType: 'LYRIKA', entityId: 'song_123', label: 'Inspiration' }] }
      }, userSignature as any);
      
      expect((res.mongo as any).uid).toBe('sujet_1');
      expect((res.mongo as any).excerpt).toContain('...'); // SEO optimisé !
      expect((res.mongo as any).kosmicBoon.nextKosmicBoon).toBe(42);
      expect((res.mongo as any).settings.allowPropagation).toBe(true);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);

      // 🌿 L'Écho est parti vers la Canopée !
      expect(mockFosterNotification).toHaveBeenCalledTimes(1);
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ recipientUid: 'bird_follower_1', type: 'NEW_SUJET' }), 
        userSignature
      );
    });

    it('🟢 doit forger un sujet avec rôle SUBLIMATOR et conserver l\'exclusivité', async () => {
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(null) })
      } as any);

      vi.mocked(SujetModel.create).mockResolvedValueOnce([
        { 
          toObject: () => ({
            uid: 'sujet_sub', 
            status: 'PUBLISHED',
            copyrightMetadata: { role: 'SUBLIMATOR', isExclusiveIlot: true }
          })
        }
      ] as any);

      const res = await orchestrator.fosterSujet({
        title: 'Pensée Sublimée',
        content: 'Texte court',
        authorUid: 'bird_author',
        status: 'PUBLISHED',
        copyrightMetadata: { role: 'SUBLIMATOR', isExclusiveIlot: true }
      }, userSignature as any);

      expect((res.mongo as any).copyrightMetadata.role).toBe('SUBLIMATOR');
      // On vérifie que la notification porte bien la mention "Exclusivité"
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ title: expect.stringContaining('Exclusivité') })
        }),
        expect.anything()
      );
    });

    it('🟢 doit forger un sujet et annuler l\'exclusivité si le rôle est CURATOR', async () => {
      vi.mocked(SujetModel.findOne).mockReturnValue({
        session: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValueOnce(null) })
      } as any);

      // Mock de la capture du paramètre modifié.
      vi.mocked(SujetModel.create).mockImplementation(async (docs: any) => {
        expect(docs[0].copyrightMetadata.isExclusiveIlot).toBe(false); // La sécurité a agi !
        return [{ toObject: () => docs[0] }] as any; 
      });

      await orchestrator.fosterSujet({
        title: 'Pensée Relayée',
        content: 'Texte',
        authorUid: 'bird_author',
        copyrightMetadata: { role: 'CURATOR', isExclusiveIlot: true } // Demande abusive
      }, userSignature as any);
    });
  });

  describe('updateSujet', () => {
    it('🔴 doit rejeter (404) si le sujet est introuvable', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);
      await expect(
        orchestrator.updateSujet('inconnu', {}, adminSignature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit mettre à jour un sujet avec succès', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author' };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockSujet as any);
            
      vi.mocked(SujetModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({ ...mockSujet, title: 'Updated' })
      } as any);

      const res = await orchestrator.updateSujet('mon-sujet', { title: 'Updated' }, userSignature as any);
      
      expect((res.mongo as { title: string }).title).toBe('Updated');
    });
  });

  describe('disintegrateSujet', () => {
    it('🔴 doit rejeter (403) si l\'acteur n\'est ni l\'auteur ni admin', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author' };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockSujet as any);

      await expect(
        orchestrator.disintegrateSujet('mon-sujet', { actorUid: 'intruder', capabilities: [] } as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit désintégrer le sujet avec succès et nettoyer les médias S3 si la DB a réussi', async () => {
      const mockSujet = { uid: 'sujet_1', slug: 'mon-sujet', authorUid: 'bird_author', media: { coverImageUrl: 'http://s3/img.jpg' } };
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockSujet as any);
      vi.mocked(SujetModel.deleteOne).mockResolvedValueOnce({ deletedCount: 1 } as any);

      const res = await orchestrator.disintegrateSujet('mon-sujet', userSignature as any);
      
      expect(res.success).toBe(true);
      expect(mockStorageManager.deleteFile).toHaveBeenCalledWith('key_http://s3/img.jpg');
    });
  });
});
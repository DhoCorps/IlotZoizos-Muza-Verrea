import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationOrchestrator } from '../annotation.orchestrator';
import { UniversalAnnotationModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';
import type { ActionSignature, ICreateUniversalAnnotationInput } from '@ilot/types';

// 🛡️ Utilisation de vi.hoisted pour survivre au hissage de Vitest
const { mockFosterNotification } = vi.hoisted(() => {
  return {
    mockFosterNotification: vi.fn().mockResolvedValue({ success: true })
  };
});

// 1. Mock de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    UniversalAnnotationModel: {
      findOne: vi.fn(),
      create: vi.fn(),
      deleteOne: vi.fn(),
    },
    OiseauModel: {}, // Nécessaire pour resolveCanonicalUid
  };
});

// 2. Mock du Transaction Manager
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, callback) => {
      const mockMongoSession = {} as any;
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({
          records: [{ get: () => 'owner_uid_123' }]
        })
      };
      return await callback(mockMongoSession, mockNeo4jTx as any);
    }),
  },
}));

// 3. Mock des utilitaires globaux
vi.mock('../../utils/orchestrator.engine', () => ({
  resolveCanonicalUid: vi.fn(async (_model, uid) => uid),
  safeSyncUniversalInteraction: vi.fn().mockResolvedValue(true)
}));

// 4. Mock du NotificationOrchestrator
vi.mock('../notification.orchestrator', () => ({
  NotificationOrchestrator: vi.fn().mockImplementation(() => ({
    fosterNotification: mockFosterNotification
  }))
}));

describe('AnnotationOrchestrator - Surlignage et Résonance Universelle', () => {
  let orchestrator: AnnotationOrchestrator;
  const userSignature: ActionSignature = { actorUid: 'reader_1', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Ré-affirmation du comportement pour pallier au mockReset global éventuel
    mockFosterNotification.mockClear();
    mockFosterNotification.mockResolvedValue({ success: true });
    
    // 🛠️ INJECTION DE DÉPENDANCE : On injecte directement le mock dans l'orchestrateur
    const injectedNotificationOrchestrator = {
      fosterNotification: mockFosterNotification
    } as any;

    orchestrator = new AnnotationOrchestrator(injectedNotificationOrchestrator);
  });

  describe('fosterAnnotation (Création)', () => {
    it('🟢 doit forger une annotation sur un Article (Sujet) et notifier l\'auteur cible', async () => {
      const payload: ICreateUniversalAnnotationInput = {
        targetUid: 'article_999',
        targetType: 'ARTICLE',
        selectedText: 'Une idée brillante.',
        emotion: '💡'
      };

      vi.mocked(UniversalAnnotationModel.create).mockResolvedValueOnce([{ uid: 'annot_1' }] as any);

      const result = await orchestrator.fosterAnnotation(payload, userSignature);

      expect(result.success).toBe(true);
      expect(UniversalAnnotationModel.create).toHaveBeenCalledTimes(1);
      expect(TransactionManager.execute).toHaveBeenCalledTimes(1);
      
      // On vérifie que la notification a bien été lancée vers l'auteur de la cible
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUid: 'owner_uid_123',
          type: 'NEW_ANNOTATION'
        }),
        expect.anything()
      );
    });
  });

  describe('toggleScholarSeal (Prestige / Érudit)', () => {
    it('🟢 doit permettre à l\'auteur de la cible de décerner le sceau de l\'érudit', async () => {
      const mockAnnotation = {
        uid: 'annot_1',
        targetUid: 'article_999',
        targetType: 'ARTICLE',
        authorUid: 'reader_1',
        isScholarSealed: false,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.mocked(UniversalAnnotationModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockAnnotation)
      } as any);

      const targetOwnerSignature: ActionSignature = { actorUid: 'owner_uid_123', capabilities: [] };

      const result = await orchestrator.toggleScholarSeal('annot_1', true, targetOwnerSignature);

      expect(result.success).toBe(true);
      expect(result.isScholarSealed).toBe(true);
      expect(mockAnnotation.save).toHaveBeenCalledTimes(1);

      // Notification de félicitation envoyée au lecteur
      expect(mockFosterNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SCHOLAR_SEAL_AWARDED', recipientUid: 'reader_1' }),
        expect.anything()
      );
    });

    it('🔴 doit bloquer le Sceau si l\'acteur n\'est PAS l\'auteur de la cible', async () => {
      const mockAnnotation = { uid: 'annot_1', targetUid: 'article_999' };

      vi.mocked(UniversalAnnotationModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockAnnotation)
      } as any);

      // On force Neo4j à simuler que l'acteur n'est pas l'auteur
      vi.mocked(TransactionManager.execute).mockImplementationOnce(async (_name, callback) => {
        const mockNeo4jTx = { run: vi.fn().mockResolvedValue({ records: [] }) }; // Aucun owner trouvé
        return await callback({} as any, mockNeo4jTx as any);
      });

      const fakeOwnerSignature: ActionSignature = { actorUid: 'hacker_99', capabilities: [] };

      await expect(
        orchestrator.toggleScholarSeal('annot_1', true, fakeOwnerSignature)
      ).rejects.toThrow(/Seul l'auteur de l'œuvre ciblée/);
    });
  });

  describe('disintegrateAnnotation (Suppression)', () => {
    it('🟢 doit permettre à l\'auteur de l\'annotation de la supprimer', async () => {
      const mockAnnotation = { uid: 'annot_1', authorUid: 'reader_1', targetUid: 'article_999' };

      vi.mocked(UniversalAnnotationModel.findOne).mockReturnValue({
        session: vi.fn().mockResolvedValue(mockAnnotation)
      } as any);

      const result = await orchestrator.disintegrateAnnotation('annot_1', userSignature);

      expect(result.success).toBe(true);
      expect(UniversalAnnotationModel.deleteOne).toHaveBeenCalledTimes(1);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationOrchestrator } from '../notification.orchestrator';
import { NotificationModel } from '@ilot/infrastructure';
import { TransactionManager } from '../transactionManager';
import { IlotError } from '../../errors/ilot.errors';

// ==========================================
// MOCKS INCHIFFRÉS
// ==========================================
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    NotificationModel: {
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      updateMany: vi.fn(),
    },
  };
});

// Mock du TransactionManager comme dans le SujetOrchestrator
vi.mock('../transactionManager', () => ({
  TransactionManager: {
    execute: vi.fn(async (_name, cb) => {
      const mockNeo4jTx = {
        run: vi.fn().mockResolvedValue({
          records: [{ get: (key: string) => (key === 'mode' ? 'DIGEST' : 20) }]
        })
      };
      return cb('mock-mongo-session', mockNeo4jTx);
    }),
  },
}));

describe('🔔 NotificationOrchestrator - La Canopée Tampon', () => {
  let orchestrator: NotificationOrchestrator;
  const signature = { actorUid: 'bird_sender', capabilities: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new NotificationOrchestrator();
  });

  describe('fosterNotification', () => {
    it('🔴 doit rejeter (403) si le senderUid ne correspond pas à la signature de l\'Oiseau', async () => {
      await expect(
        orchestrator.fosterNotification({
          recipientUid: 'bird_target',
          senderUid: 'fake_sender', // usurpation
          category: 'SOCIAL',
          type: 'FOLLOW',
          payload: { message: 'Test' }
        }, signature as any)
      ).rejects.toThrow(IlotError);
    });

    it('🟢 doit grouper la notification si le mode est DIGEST et qu\'une alerte similaire existe (Écho Intelligent)', async () => {
      // On simule une notification non-lue existante dans la Silice
      vi.mocked(NotificationModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          uid: 'notif_1',
          payload: { groupedCount: 2, message: 'Plusieurs échos résonnent...' }
        })
      } as any);

      const res = await orchestrator.fosterNotification({
        recipientUid: 'bird_target',
        senderUid: 'bird_sender',
        category: 'SOCIAL',
        type: 'COMMENT',
        payload: { message: 'Un nouveau commentaire' }
      }, signature as any);

      expect(res.isGrouped).toBe(true);
      expect(res.status).toBe('grouped');
      expect((res.mongo as any).payload.groupedCount).toBe(2);
      expect(NotificationModel.create).not.toHaveBeenCalled(); // Pas de création, juste un update !
    });

    it('🟢 doit créer une nouvelle notification avec une date planifiée (Canopée Tampon) si aucun groupe n\'existe', async () => {
      // Aucune notification existante à grouper
      vi.mocked(NotificationModel.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null)
      } as any);

      vi.mocked(NotificationModel.create).mockResolvedValueOnce([
        { uid: 'new_notif', scheduledFor: new Date('2026-09-22T20:00:00.000Z') }
      ] as any);

      const res = await orchestrator.fosterNotification({
        recipientUid: 'bird_target',
        senderUid: 'bird_sender',
        category: 'TEXT',
        type: 'PUBLISH',
        payload: { message: 'Un nouveau texte' }
      }, signature as any);

      expect(res.isGrouped).toBe(false);
      expect(NotificationModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('markAsRead', () => {
    it('🟢 doit apaiser les échos en marquant les notifications comme lues', async () => {
      vi.mocked(NotificationModel.updateMany).mockResolvedValueOnce({ modifiedCount: 3 } as any);

      const res = await orchestrator.markAsRead(['uid_1', 'uid_2'], { actorUid: 'bird_target' } as any);

      expect(res.success).toBe(true);
      expect(res.modifiedCount).toBe(3);
      expect(NotificationModel.updateMany).toHaveBeenCalledWith(
        { uid: { $in: ['uid_1', 'uid_2'] }, recipientUid: 'bird_target' },
        { $set: { isRead: true } },
        { session: 'mock-mongo-session' }
      );
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Ajuste le chemin ci-dessous selon ton arborescence exacte
import { GET, PUT } from '@/app/api/resonance/notifications/route'; 
import { NotificationModel, getNeo4jSession } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';

// ==========================================
// 🎭 MOCKS DE L'ENVIRONNEMENT NEXT.JS & INFRA
// ==========================================
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, status: init?.status || 200 })),
  }
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  NotificationModel: {
    find: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

// 🛠️ Mock propre avec syntaxe de Classe pour éviter l'erreur d'instanciation
vi.mock('@ilot/shared-core', () => ({
  NotificationOrchestrator: class {
    markAsRead = vi.fn().mockResolvedValue({ success: true, modifiedCount: 2 });
  }
}));

// On améliore le mock de handleRouteError pour qu'il renvoie un vrai "status" 
// et qu'il log l'erreur dans la console au cas où la matrice vacille !
vi.mock('@/lib/api-guards', () => ({
  withAura: vi.fn((handler) => async (req: any, context: any) => {
    return handler(req, context, { uid: 'bird_user_1', capabilities: [] });
  }),
  handleRouteError: vi.fn((error, msg) => {
    console.error("🔴 ERREUR CAPTURÉE PAR LE GARDIEN :", error);
    return { status: 500, body: { error: msg, details: error } };
  }),
}));

// ==========================================
// 🧪 TESTS : ROUTE NOTIFICATIONS
// ==========================================
describe('Route /api/notifications', () => {
  let mockRun: any;
  let mockClose: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRun = vi.fn();
    mockClose = vi.fn();

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose,
    } as any);
  });

  describe('GET (Récupération de la Canopée Tampon)', () => {
    it('🟢 devrait récupérer les notifications actives (immédiates ou dont l\'heure du Digest est passée)', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { uid: 'notif_1', isRead: false },
          { uid: 'notif_2', isRead: true }
        ])
      };
      
      vi.mocked(NotificationModel.find).mockReturnValue(mockChain as any);

      const req = {} as any; 
      const res: any = await GET(req, {} as any);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(1); 
      expect(res.body.data).toHaveLength(2);
      expect(NotificationModel.find).toHaveBeenCalled();
    });
  });

  describe('PUT (Mutations)', () => {
    it('🔴 devrait rejeter (400) si l\'action est inconnue', async () => {
      const req = {
        json: vi.fn().mockResolvedValue({ action: 'UNKNOWN_ACTION' })
      } as any;

      const res: any = await PUT(req, {} as any);
      
      expect(res.status).toBe(400);
      // Zod met le message général dans `res.body.error`
      expect(res.body.error).toContain('Paramètres de notification invalides');
      // Et le message spécifique dans le dictionnaire des erreurs de champs
      expect(res.body.details.fieldErrors.action[0]).toContain('Action inconnue');
    });

    it('🔴 devrait rejeter (400) si les paramètres de l\'action sont incomplets (MARK_READ)', async () => {
      const req = {
        json: vi.fn().mockResolvedValue({ action: 'MARK_READ' }) // notificationUids manquants
      } as any;

      const res: any = await PUT(req, {} as any);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Paramètres de notification invalides');
      // Zod place l'erreur du ".refine()" dans le tableau formErrors
      expect(res.body.details.formErrors[0]).toContain('discordants');
    });

    it('🟢 devrait apaiser les échos (MARK_READ) via le NotificationOrchestrator', async () => {
      const req = {
        json: vi.fn().mockResolvedValue({
          action: 'MARK_READ',
          notificationUids: ['notif_1', 'notif_2']
        })
      } as any;

      const res: any = await PUT(req, {} as any);
      
      expect(res.status).toBe(200);
      expect(res.body.modifiedCount).toBe(2);
      expect(revalidateTag).toHaveBeenCalledWith('notifications-bird_user_1');
    });

    it('🟢 devrait configurer l\'heure du Digest (UPDATE_DIGEST) via Neo4j', async () => {
      mockRun.mockResolvedValue({
        records: [{ get: () => ({ properties: {} }) }]
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          action: 'UPDATE_DIGEST',
          targetUid: 'author_42',
          mode: 'ZEN',
          digestHour: 8
        })
      } as any;

      const res: any = await PUT(req, {} as any);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('rythme de la Canopée a été ajusté');

      expect(mockRun).toHaveBeenCalledTimes(1);
      const [cypherCall, paramsCall] = mockRun.mock.calls[0];
      
      // 🌿 LA CORRECTION EST ICI : Ajout de l'espace entre le "=" et le "$"
      expect(cypherCall).toContain('SET r.mode = $mode, r.digestHour = $digestHour');
      expect(paramsCall.userUid).toBe('bird_user_1');
      expect(paramsCall.mode).toBe('ZEN');
      
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(revalidateTag).toHaveBeenCalledWith('notifications');
    });
  });
});
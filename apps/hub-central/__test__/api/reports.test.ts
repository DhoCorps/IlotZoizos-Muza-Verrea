import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/reports/route';
import { OiseauModel, ReportModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// 🛡️ Mock de withAura pour court-circuiter l'auth et forcer notre currentUser
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const mockUser = { uid: 'bird_plaignant', capabilities: [] };
    return handler(req, context, mockUser);
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    OiseauModel: {
      findOne: vi.fn(),
    },
    ReportModel: {
      create: vi.fn(),
      find: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('Routes API - Branche de la Paix (Reports)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/reports', () => {
    it('🔴 doit rejeter la requête (400) si le motif ou la cible sont manquants', async () => {
      const req = new Request('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ reason: "Il m'a volé mes plumes." }) // targetIdentifier manquant
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Paramètres incomplets");
    });

    it('🔴 doit rejeter (400) si l\'oiseau tente de se signaler lui-même', async () => {
      // 🪡 On mocke DEUX fois, car la route cherche la cible, PUIS le plaignant
      vi.mocked(findEntityBySlugOrUid)
        .mockResolvedValueOnce({ uid: 'bird_plaignant', _id: 'mongo_id_1' } as any) // 1er appel : la cible
        .mockResolvedValueOnce({ uid: 'bird_plaignant', _id: 'mongo_id_1' } as any); // 2ème appel : le plaignant

      const req = new Request('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_plaignant', reason: "Auto-sabotage." })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("On ne peut pas se signaler soi-même");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_plaignant');
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(2); // On vérifie que le helper a bien été appelé deux fois !
    });

    it('🟢 doit créer le signalement (Médiation) et invalider le cache avec succès', async () => {
      // Mock: Le premier appel trouve la cible, le second trouve le plaignant
      vi.mocked(findEntityBySlugOrUid)
        .mockResolvedValueOnce({ uid: 'bird_accuse', _id: 'mongo_id_2' } as any) // 1er appel: Accusé
        .mockResolvedValueOnce({ uid: 'bird_plaignant', _id: 'mongo_id_1' } as any); // 2ème appel: Plaignant

      vi.mocked(ReportModel.create).mockResolvedValueOnce({ uid: 'report_123' } as any);

      const req = new Request('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_accuse', reason: "Trahison dans la canopée." })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('mediation');
      expect(findEntityBySlugOrUid).toHaveBeenNthCalledWith(1, OiseauModel, 'bird_accuse');
      expect(findEntityBySlugOrUid).toHaveBeenNthCalledWith(2, OiseauModel, 'bird_plaignant');
      expect(ReportModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/reports', () => {
    it('🟢 doit retourner la liste des signalements de l\'utilisateur avec succès', async () => {
      // Résolution du visiteur via le helper
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'bird_plaignant', _id: 'mongo_id_1' } as any);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'report_1', status: 'mediation' }])
      };
      vi.mocked(ReportModel.find).mockReturnValue(mockQuery as any);

      const req = new Request('http://localhost/api/reports');
      const res: NextResponse = await GET(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_plaignant');
      expect(ReportModel.find).toHaveBeenCalledTimes(1);
    });
  });
});
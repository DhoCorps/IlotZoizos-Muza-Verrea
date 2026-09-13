// app/api/reports/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/reports/route';
import { OiseauModel, ReportModel } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// 🛡️ Mock de withAura pour court-circuiter l'auth et forcer notre currentUser
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const mockUser = { uid: 'bird_plaignant', capabilities: [] };
    return handler(req, context, mockUser);
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOne: vi.fn(),
  },
  ReportModel: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

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
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'bird_plaignant', _id: 'mongo_id_1' })
      } as any);

      const req = new Request('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_plaignant', reason: "Auto-sabotage." })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("On ne peut pas se signaler soi-même");
    });

    it('🟢 doit créer le signalement (Médiation) et invalider le cache avec succès', async () => {
      // Mock: Le premier appel trouve la cible, le second trouve le plaignant
      vi.mocked(OiseauModel.findOne)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ uid: 'bird_accuse', _id: 'mongo_id_2' }) } as any)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ uid: 'bird_plaignant', _id: 'mongo_id_1' }) } as any);

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
      expect(ReportModel.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/reports', () => {
    it('🟢 doit retourner la liste des signalements de l\'utilisateur avec succès', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'bird_plaignant', _id: 'mongo_id_1' })
      } as any);

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
      expect(ReportModel.find).toHaveBeenCalledTimes(1);
    });
  });
});
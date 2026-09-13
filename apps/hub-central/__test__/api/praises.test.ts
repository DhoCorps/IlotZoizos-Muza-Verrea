// app/api/praises/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/praises/route';
import { OiseauModel, PraiseModel } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// 🛡️ Mock du garde du corps pour injecter notre utilisateur
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const mockUser = { uid: 'bird_donateur', capabilities: [] };
    return handler(req, context, mockUser);
  }
}));

// 👈 Sécurisation du mock asynchrone avec vi.hoisted
const { mockSyncInteraction } = vi.hoisted(() => ({
  mockSyncInteraction: vi.fn(async () => true)
}));

vi.mock('@ilot/infrastructure', () => ({
  OiseauModel: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
  PraiseModel: {
    create: vi.fn(),
    find: vi.fn(),
  },
  syncUniversalInteraction: mockSyncInteraction // Ajuste le chemin du mock si tu l'importes depuis un fichier spécifique
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('Routes API - Le Panthéon des Éloges (Praises)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/praises', () => {
    it('🔴 doit rejeter la requête (400) si le texte ou la cible sont manquants', async () => {
      const req = new Request('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ text: "Tu es génial !" }) // targetIdentifier manquant
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Paramètres incomplets");
    });

    it('🔴 doit rejeter (400) si l\'oiseau tente de se faire un éloge à lui-même', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'bird_donateur', _id: 'mongo_id_1' })
      } as any);

      const req = new Request('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_donateur', text: "Je suis le meilleur." })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("on ne peut s'adresser des éloges à soi-même");
    });

    it('🟢 doit graver l\'éloge, incrémenter le Bouclier Karmique et tisser le lien universel', async () => {
      // 1er appel: trouve l'auteur. 2ème appel: trouve la cible.
      vi.mocked(OiseauModel.findOne)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ uid: 'bird_donateur', _id: 'mongo_id_1' }) } as any)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ uid: 'bird_cible', _id: 'mongo_id_2' }) } as any);

      vi.mocked(PraiseModel.create).mockResolvedValueOnce({ text: "Super entraide !" } as any);
      vi.mocked(OiseauModel.findOneAndUpdate).mockResolvedValueOnce(true as any);

      const req = new Request('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_cible', text: "Super entraide !", type: 'civic' })
      });

      const res: NextResponse = await POST(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      
      // Vérification de l'alimentation du Bouclier Karmique
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mongo_id_2' },
        { $inc: { praisesCount: 1 } }
      );

      // Vérification du tissage de la Matrice
      expect(mockSyncInteraction).toHaveBeenCalledTimes(1);
      expect(mockSyncInteraction).toHaveBeenCalledWith('bird_donateur', 'bird_cible', 'PRAISE');
    });
  });

  describe('GET /api/praises', () => {
    it('🟢 doit retourner la liste des éloges pour la cible spécifiée', async () => {
      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'bird_cible', _id: 'mongo_id_2' })
      } as any);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ text: 'Bravo !', type: 'gratitude' }])
      };
      vi.mocked(PraiseModel.find).mockReturnValue(mockQuery as any);

      const req = new Request('http://localhost/api/praises?targetUid=bird_cible');
      const res: NextResponse = await GET(req, {} as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(PraiseModel.find).toHaveBeenCalledWith({ recipient: 'mongo_id_2' });
    });
  });
});
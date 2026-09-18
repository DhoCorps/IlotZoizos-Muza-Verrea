import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/praises/route';
import { OiseauModel, PraiseModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { NextResponse, NextRequest } from 'next/server';

// 🛡️ Mock du garde du corps pour injecter notre utilisateur
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = { uid: 'bird_donateur', capabilities: [] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

// 👈 Sécurisation du mock asynchrone avec vi.hoisted
const { mockSyncInteraction } = vi.hoisted(() => ({
  mockSyncInteraction: vi.fn(async () => true)
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    OiseauModel: {
      findOneAndUpdate: vi.fn(),
    },
    PraiseModel: {
      create: vi.fn(),
      find: vi.fn(),
    },
    syncUniversalInteraction: mockSyncInteraction,
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('Routes API - Le Panthéon des Éloges (Praises)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/praises', () => {
    it('🔴 doit rejeter la requête (400) si le texte ou la cible sont manquants', async () => {
      const req = new NextRequest('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ text: "Tu es génial !" }) // targetIdentifier manquant
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Paramètres incomplets");
    });

    it('🔴 doit rejeter (400) si l\'oiseau tente de se faire un éloge à lui-même', async () => {
      vi.mocked(findEntityBySlugOrUid)
        .mockResolvedValueOnce({ uid: 'bird_donateur', _id: 'mongo_id_1' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>)
        .mockResolvedValueOnce({ uid: 'bird_donateur', _id: 'mongo_id_1' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_donateur', text: "Je suis le meilleur." })
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("on ne peut s'adresser des éloges à soi-même");
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(2);
    });

    it('🟢 doit graver l\'éloge, incrémenter le Bouclier Karmique et tisser le lien universel', async () => {
      vi.mocked(findEntityBySlugOrUid)
        .mockResolvedValueOnce({ uid: 'bird_donateur', _id: 'mongo_id_1' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>)
        .mockResolvedValueOnce({ uid: 'bird_cible', _id: 'mongo_id_2' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      vi.mocked(PraiseModel.create).mockResolvedValueOnce({ text: "Super entraide !" } as unknown as Awaited<ReturnType<typeof PraiseModel.create>>);
      vi.mocked(OiseauModel.findOneAndUpdate).mockResolvedValueOnce(true as unknown as Awaited<ReturnType<typeof OiseauModel.findOneAndUpdate>>);

      const req = new NextRequest('http://localhost/api/praises', {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier: 'bird_cible', text: "Super entraide !", type: 'civic' })
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      
      expect(OiseauModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'mongo_id_2' },
        { $inc: { praisesCount: 1 } }
      );

      expect(mockSyncInteraction).toHaveBeenCalledTimes(1);
      expect(mockSyncInteraction).toHaveBeenCalledWith('bird_donateur', 'bird_cible', 'PRAISE');
      expect(findEntityBySlugOrUid).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /api/praises', () => {
    it('🟢 doit retourner la liste des éloges pour la cible spécifiée', async () => {
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ uid: 'bird_cible', _id: 'mongo_id_2' } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ text: 'Bravo !', type: 'gratitude' }])
      };
      vi.mocked(PraiseModel.find).mockReturnValue(mockQuery as unknown as ReturnType<typeof PraiseModel.find>);

      const req = new NextRequest('http://localhost/api/praises?targetUid=bird_cible');
      const res = await GET(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_cible');
      expect(PraiseModel.find).toHaveBeenCalledWith({ recipient: 'mongo_id_2' });
    });
  });
});
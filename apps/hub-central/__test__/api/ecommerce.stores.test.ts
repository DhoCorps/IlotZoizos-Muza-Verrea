import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/ecommerce/stores/route';
import { StoreModel, OiseauModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => handler,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number }).status || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  StoreModel: {
    find: vi.fn(() => ({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    })),
    findOne: vi.fn(),
    create: vi.fn(),
  },
  OiseauModel: {
    findOne: vi.fn(),
  },
}));

vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    createStore: vi.fn().mockResolvedValue(true),
  }))
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Stores (Boutiques)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  describe('GET /api/stores', () => {
    it('🟢 [GET] doit récupérer la liste des boutiques vérifiées avec succès (200)', async () => {
      vi.mocked(StoreModel.find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ uid: 'store_1', storeName: 'Boutique Test' }]),
      } as unknown as ReturnType<typeof StoreModel.find>);

      const req = new NextRequest('http://localhost/api/stores');
      const res = await getHandler(req, {} as ApiContext);
      const json = await res.json() as Array<{ uid: string }>;

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('store_1');
    });
  });

  describe('POST /api/stores', () => {
    it('🔴 [POST] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ storeName: 'Boutique Inconnue' })
      });

      const res = await postHandler(req, {} as ApiContext);
      expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter avec une erreur 403 si l\'oiseau est classé INDESIRABLE ou banni', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          uid: 'bird_1',
          profileStatus: 'INDESIRABLE',
          isBanned: false,
        })
      } as unknown as ReturnType<typeof OiseauModel.findOne>);

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ uid: 'store_1', storeName: 'Boutique Interdite', slug: 'boutique-interdite' })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; error: string };

      expect(res.status).toBe(403);
      expect(json.error).toContain('Souveraineté restreinte');
      expect(StoreModel.create).not.toHaveBeenCalled();
    });

    it('🟢 [POST] doit créer une boutique avec succès (201) et invalider le cache', async () => {
      global.__mockUser = { uid: 'bird_1', capabilities: [] };

      vi.mocked(OiseauModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce({
          uid: 'bird_1',
          profileStatus: 'RESPECTABLE',
          isBanned: false,
        })
      } as unknown as ReturnType<typeof OiseauModel.findOne>);

      vi.mocked(StoreModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null) // Pas de collision de slug
      } as unknown as ReturnType<typeof StoreModel.findOne>);

      vi.mocked(StoreModel.create).mockResolvedValueOnce({
        uid: 'store_new',
        storeName: 'Canopée Shop',
        slug: 'canopee-shop'
      } as unknown as Awaited<ReturnType<typeof StoreModel.create>>);

      const req = new NextRequest('http://localhost/api/stores', {
        method: 'POST',
        body: JSON.stringify({ uid: 'store_new', ownerUid: 'bird_1', storeName: 'Canopée Shop', slug: 'canopee-shop', stripeAccountId: 'acct_test' })
      });

      const res = await postHandler(req, {} as ApiContext);
      const json = await res.json() as { success: boolean; data: { uid: string } };

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.uid).toBe('store_new');
      expect(revalidateTag).toHaveBeenCalledWith('stores');
      expect(revalidateTag).toHaveBeenCalledWith('verified-stores');
      expect(revalidateTag).toHaveBeenCalledWith('user-stores-bird_1');
    });
  });
});
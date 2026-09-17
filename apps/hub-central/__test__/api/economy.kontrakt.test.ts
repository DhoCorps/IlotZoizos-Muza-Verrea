import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/economy/kontrakt/route';
import { KonTraKt, EconomyService, withNeo4jSession } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// 🛡️ Mocks de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    KonTraKt: {
      find: vi.fn(),
      countDocuments: vi.fn(),
      create: vi.fn(),
    },
    EconomyService: {
      deductResources: vi.fn(),
    },
    withNeo4jSession: vi.fn(async (cb) => {
      const mockSession = { run: vi.fn().mockResolvedValue(true) };
      return await cb(mockSession);
    })
  };
});

// Mock du guard withAura
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = { uid: 'artisan_bird', capabilities: [] };
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

// Mock de la fonction de cache de Next.js
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('GET /api/economy/kontrakt - Test du Marché', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner la liste des KonTraKts au statut pending par défaut', async () => {
    const mockContracts = [
      { _id: 'k1', gameId: 'crazymorpion', wagerCurrency: 'DHO', status: 'pending' },
      { _id: 'k2', gameId: 'plumes', wagerCurrency: 'plumes', status: 'pending' },
    ];

    const mockLean = vi.fn().mockResolvedValue(mockContracts);
    const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
    const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(KonTraKt.find).mockReturnValue({ sort: mockSort } as unknown as ReturnType<typeof KonTraKt.find>);

    const req = new NextRequest('http://localhost/api/economy/kontrakt');
    const response = await getHandler(req, {} as ApiContext);
    const json = await response.json() as { success: boolean; count: number; data: Array<unknown> };

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.count).toBe(2);
    expect(json.data).toEqual(mockContracts);
    expect(KonTraKt.find).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('🟢 doit permettre de filtrer par jeu spécifique et statut global', async () => {
    const mockLean = vi.fn().mockResolvedValue([]);
    const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
    const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(KonTraKt.find).mockReturnValue({ sort: mockSort } as unknown as ReturnType<typeof KonTraKt.find>);

    const req = new NextRequest('http://localhost/api/economy/kontrakt?status=all&gameId=crazymorpion');
    const response = await getHandler(req, {} as ApiContext);
    const json = await response.json() as { success: boolean };

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(KonTraKt.find).toHaveBeenCalledWith({ gameId: 'crazymorpion' });
  });

  it('🔴 doit capturer les erreurs de la base et retourner une erreur 500', async () => {
    vi.mocked(KonTraKt.find).mockImplementation(() => {
      throw new Error('Erreur de connexion MongoDB');
    });

    const req = new NextRequest('http://localhost/api/economy/kontrakt');
    const response = await getHandler(req, {} as ApiContext);
    const json = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});

describe('Route API - Création de KonTraKt', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    gameId: 'plajia_lvl_1',
    gameMode: 'multiplayer',
    difficulty: 'Artisan',
    wagerAmount: 5,
    wagerCurrency: 'plumes',
    targetDhOValue: 5.5,
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };

  const mockRequest = (body: unknown) => new NextRequest('http://localhost/api/economy/kontrakt', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  it('🔴 doit bloquer la création si le quota de 3 KonTraKts en attente est atteint', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(3);

    const response = await postHandler(mockRequest(validPayload), {} as ApiContext);
    const json = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(429);
    expect(json.error).toContain('Quota atteint');
    expect(EconomyService.deductResources).not.toHaveBeenCalled();
  });

  it('🔴 doit bloquer la création si le payload est malformé (ex: mise négative)', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(0);

    const invalidPayload = { ...validPayload, wagerAmount: -10 };
    const response = await postHandler(mockRequest(invalidPayload), {} as ApiContext);
    const json = await response.json() as { success: boolean; error: string };

    expect(response.status).toBe(400);
    expect(json.error).toContain('malformé');
  });

  it('🟢 doit sceller le contrat, déduire les fonds et utiliser withNeo4jSession', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(1);
    vi.mocked(EconomyService.deductResources).mockResolvedValueOnce(true as unknown as Awaited<ReturnType<typeof EconomyService.deductResources>>);
    vi.mocked(KonTraKt.create).mockResolvedValueOnce({ _id: 'new_kontrakt_123', ...validPayload } as unknown as Awaited<ReturnType<typeof KonTraKt.create>>);

    const response = await postHandler(mockRequest(validPayload), {} as ApiContext);
    const json = await response.json() as { success: boolean };

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(EconomyService.deductResources).toHaveBeenCalledWith('artisan_bird', { plumes: 5 });
    expect(withNeo4jSession).toHaveBeenCalled();
  });
});
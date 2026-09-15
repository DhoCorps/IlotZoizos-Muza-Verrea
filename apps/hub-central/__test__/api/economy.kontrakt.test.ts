// __test__/api/economy.kontrakt.market.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/economy/kontrakt/route';
import { KonTraKt, EconomyService, getNeo4jSession } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

// 🛡️ Mocks de l'infrastructure (avec find, countDocuments et create)
vi.mock('@ilot/infrastructure', () => ({
  KonTraKt: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
  EconomyService: {
    deductResources: vi.fn(),
  },
  getNeo4jSession: vi.fn()
}));

// Mock du guard withAura pour injecter notre currentUser
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { uid: 'artisan_bird', capabilities: [] };
    return handler(req, context, mockUser);
  }
}));

// Mock de la fonction de cache de Next.js
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn()
}));

describe('GET /api/economy/kontrakt - Test du Marché', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit retourner la liste des KonTraKts au statut pending par défaut', async () => {
    const mockContracts = [
      { _id: 'k1', gameId: 'crazymorpion', wagerCurrency: 'DHO', status: 'pending' },
      { _id: 'k2', gameId: 'plumes', wagerCurrency: 'plumes', status: 'pending' },
    ];

    // Simulation du chaînage Mongoose (.find().sort().limit().lean())
    const mockLean = vi.fn().mockResolvedValue(mockContracts);
    const mockLimit = vi.fn().mockReturnValue({ lean: mockLean });
    const mockSort = vi.fn().mockReturnValue({ limit: mockLimit });
    vi.mocked(KonTraKt.find).mockReturnValue({ sort: mockSort } as any);

    const req = new NextRequest('http://localhost/api/economy/kontrakt');
    const response = await GET(req, {} as any);
    const json = await response.json();

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
    vi.mocked(KonTraKt.find).mockReturnValue({ sort: mockSort } as any);

    const req = new NextRequest('http://localhost/api/economy/kontrakt?status=all&gameId=crazymorpion');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(KonTraKt.find).toHaveBeenCalledWith({ gameId: 'crazymorpion' });
  });

  it('🔴 doit capturer les erreurs de la base et retourner une erreur 500', async () => {
    vi.mocked(KonTraKt.find).mockImplementation(() => {
      throw new Error('Erreur de connexion MongoDB');
    });

    const req = new NextRequest('http://localhost/api/economy/kontrakt');
    const response = await GET(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});

describe('Route API - Création de KonTraKt', () => {
  const mockRun = vi.fn().mockResolvedValue(true);
  const mockClose = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose
    } as any);
  });

  const validPayload = {
    gameId: 'plajia_lvl_1',
    gameMode: 'multiplayer',
    difficulty: 'Artisan',
    wagerAmount: 5,
    wagerCurrency: 'plumes',
    targetDhOValue: 5.5,
    expiresAt: new Date(Date.now() + 86400000).toISOString() // +24h
  };

  const mockRequest = (body: any) => ({
    json: vi.fn().mockResolvedValue(body)
  } as any);

  it('🔴 doit bloquer la création si le quota de 3 KonTraKts en attente est atteint', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(3);

    const response = await POST(mockRequest(validPayload), {} as any);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Quota atteint');
    expect(EconomyService.deductResources).not.toHaveBeenCalled();
  });

  it('🔴 doit bloquer la création si le payload est malformé (ex: mise négative)', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(0);

    const invalidPayload = { ...validPayload, wagerAmount: -10 };
    const response = await POST(mockRequest(invalidPayload), {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('malformé');
  });

  it('🟢 doit sceller le contrat, déduire les fonds et fermer la session Neo4j', async () => {
    vi.mocked(KonTraKt.countDocuments).mockResolvedValueOnce(1); // Quota OK
    vi.mocked(EconomyService.deductResources).mockResolvedValueOnce(true as any);
    vi.mocked(KonTraKt.create).mockResolvedValueOnce({ _id: 'new_kontrakt_123', ...validPayload } as any);

    const response = await POST(mockRequest(validPayload), {} as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(EconomyService.deductResources).toHaveBeenCalledWith('artisan_bird', { plumes: 5 });
    
    expect(mockRun).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
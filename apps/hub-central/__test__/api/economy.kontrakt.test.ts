import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/economy/kontrakt/route';
import { KonTraKt, EconomyService, getNeo4jSession } from '@ilot/infrastructure';

// 🛡️ Mocks de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
  KonTraKt: {
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
  EconomyService: {
    deductResources: vi.fn(),
  },
  // On mock juste la coquille de la fonction ici
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

describe('Route API - Création de KonTraKt', () => {
  
  // 🟢 LA CORRECTION EST ICI : On crée nos espions (spies) une seule fois pour tout le fichier
  const mockRun = vi.fn().mockResolvedValue(true);
  const mockClose = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    
    // On force la fonction à TOUJOURS retourner ces deux espions précis
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
    // Simule que l'Oiseau a déjà 3 contrats actifs
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
    
    // Vérification cruciale avec nos espions uniques
    expect(mockRun).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
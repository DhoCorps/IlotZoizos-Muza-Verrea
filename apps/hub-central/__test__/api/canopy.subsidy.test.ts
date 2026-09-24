import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/route';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));

// Mock du guard withAura respectant dynamiquement l'état de l'utilisateur simulé
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: Request, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
  };
});

// 🛡️ Mock de l'Orchestrateur avec une vraie classe ES6 pour supporter "new"
const mockFosterSubsidy = vi.fn().mockResolvedValue({
  uid: 'sub_123',
  title: 'Aide au studio',
  requesterUid: 'bird_test_1'
});

vi.mock('@ilot/shared-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/shared-core')>();
  return {
    ...actual,
    CanopySubsidyOrchestrator: class {
      fosterSubsidy = mockFosterSubsidy;
    }
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: Request, ctx: ApiContext) => Promise<Response>;

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Canopée Subventions (POST /api/canopy/subsidy)', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', motivation: 'Test', requestedAmount: 50000, currency: 'EUR' })
    });

    const response = await postHandler(req, {} as ApiContext);
    const json = await response.json();
    
    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  it('🟢 doit créer une subvention via l\'Orchestrateur (201) et invalider le cache de la Canopée', async () => {
    global.__mockUser = { uid: 'bird_test_1', capabilities: [] };

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Aide au studio',
        motivation: 'Achat de matériel analogique',
        requestedAmount: 100000, // 1000,00 € en centimes
        currency: 'EUR',
        isRented: false
      })
    });

    const response = await postHandler(req, {} as ApiContext);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    
    expect(mockFosterSubsidy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aide au studio',
        requestedAmount: 100000,
        currency: 'EUR'
      }),
      expect.objectContaining({
        actorUid: 'bird_test_1'
      })
    );

    expect(revalidateTag).toHaveBeenCalledWith('canopy-subsidies');
  });
});
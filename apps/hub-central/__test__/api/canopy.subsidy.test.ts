// Fichier : __test__/api/canopy.subsidy.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/route';
import { SubsidyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock du guard withAura respectant dynamiquement l'état de l'utilisateur simulé
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = (global as any).__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SubsidyModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([])
        })
      })
    }),
    create: vi.fn().mockResolvedValue({
      uid: 'sub_123',
      title: 'Aide au studio',
      requesterUid: 'bird_test_1'
    })
  }
}));

declare global {
  var __mockUser: any;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Canopée Subventions (POST /api/canopy/subsidy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', motivation: 'Test', requestedAmount: 500, currency: 'EUR' })
    });

    const response = await POST(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(401);
  });

  it('🟢 doit créer une subvention (201) et invalider le cache de la Canopée', async () => {
    (global as any).__mockUser = { uid: 'bird_test_1', capabilities: [] };

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Aide au studio',
        motivation: 'Achat de matériel analogique',
        requestedAmount: 1000,
        currency: 'EUR',
        isRented: false
      })
    });

    const response = await POST(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(SubsidyModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterUid: 'bird_test_1',
        title: 'Aide au studio'
      })
    );

    // 💥 Vérification que le tag de cache a bien été invalidé
    expect(revalidateTag).toHaveBeenCalledWith('canopy-subsidies');
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/route';
import { SubsidyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth/next';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
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

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Canopée Subventions (POST /api/canopy/subsidy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter (401) si l\'oiseau n\'est pas authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/canopy/subsidy', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', motivation: 'Test', requestedAmount: 500, currency: 'EUR' })
    });

    const response = await POST(req, {} as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
  });

  it('🟢 doit créer une subvention (201) et invalider le cache de la Canopée', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { uid: 'bird_test_1', capabilities: [] }
    } as any);

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
    expect(SubsidyModel.create).toHaveBeenCalled();

    // 💥 Vérification que le tag de cache a bien été invalidé
    expect(revalidateTag).toHaveBeenCalledWith('canopy-subsidies');
  });
});
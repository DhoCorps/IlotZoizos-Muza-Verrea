import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/canopy/subsidy/vote/route'; // Ajuste le chemin selon ton arborescence exacte
import { CanopySubsidyOrchestrator } from '@ilot/shared-core';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn()
}));

vi.mock('@ilot/shared-core', () => ({
  CanopySubsidyOrchestrator: {
    voteForSubsidy: vi.fn()
  }
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: Request, context: any) => {
    const currentUser = (global as any).__mockUser !== undefined 
      ? (global as any).__mockUser 
      : { uid: 'bird_voter_123' };
    return handler(req, context, currentUser);
  }
}));

describe('API Route - /api/canopy/subsidy/vote (avec Cache Sécurisé)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🟢 doit enregistrer un vote avec succès en mode POST (200)', async () => {
    vi.mocked(CanopySubsidyOrchestrator.voteForSubsidy).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(CanopySubsidyOrchestrator.voteForSubsidy).toHaveBeenCalledWith('sub_test_1', 'bird_voter_123');
  });

  it('🔴 doit rejeter la requête (400) si l\'ID de subvention est manquant', async () => {
    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("ID de subvention requis pour voter.");
  });

  it('🔴 doit rejeter la requête (401) si l\'oiseau n\'est pas identifié', async () => {
    (global as any).__mockUser = null;

    const req = new Request('http://localhost/api/canopy/subsidy/vote', {
      method: 'POST',
      body: JSON.stringify({ subsidyId: 'sub_test_1' })
    });

    const response = await POST(req, {} as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Oiseau non identifié");
  });
});
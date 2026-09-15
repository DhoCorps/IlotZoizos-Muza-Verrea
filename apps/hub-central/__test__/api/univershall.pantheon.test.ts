import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/univershall/pantheon/route';
import { UniversHallPantheonOrchestrator } from '@ilot/shared-core';

vi.mock('@ilot/shared-core', () => ({
  UniversHallPantheonOrchestrator: {
    calculatePantheon: vi.fn(),
  },
}));

vi.mock('@lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

// Mock de Next.js cache pour éviter l'exécution réelle du cache pendant les tests unitaires
vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
}));

describe('API Route /api/univershall/pantheon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit calculer, fusionner et retourner le classement d\'élite du Panthéon avec succès', async () => {
    vi.mocked(UniversHallPantheonOrchestrator.calculatePantheon).mockResolvedValue([
      { uid: 'bird_2', pseudo: 'Mécène', score: 880 },
      { uid: 'bird_1', pseudo: 'Alchimiste', score: 400 }
    ] as any);

    const req = new Request('http://localhost/api/univershall/pantheon');
    const res = await GET(req as any, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.pantheon).toHaveLength(2);
    expect(json.pantheon[0].uid).toBe('bird_2');
    expect(json.pantheon[1].uid).toBe('bird_1');
    expect(UniversHallPantheonOrchestrator.calculatePantheon).toHaveBeenCalled();
  });
});
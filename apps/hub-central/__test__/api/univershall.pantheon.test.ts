import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/univershall/pantheon/route';
import { UniversHallPantheonOrchestrator } from '@ilot/shared-core';
import { NextRequest } from 'next/server';

vi.mock('@ilot/shared-core', () => ({
  UniversHallPantheonOrchestrator: {
    calculatePantheon: vi.fn(),
  },
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

// Mock de Next.js cache pour éviter l'exécution réelle du cache pendant les tests unitaires
vi.mock('next/cache', () => ({
  unstable_cache: (fn: Function) => fn,
}));

describe('API Route /api/univershall/pantheon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit calculer, fusionner et retourner le classement d\'élite du Panthéon avec succès', async () => {
    vi.mocked(UniversHallPantheonOrchestrator.calculatePantheon).mockResolvedValue([
      { uid: 'bird_2', pseudo: 'Mécène', resonanceScore: 880, financialEnergy: 100, praisesCount: 10, matrixScore: 10 },
      { uid: 'bird_1', pseudo: 'Alchimiste', resonanceScore: 400, financialEnergy: 50, praisesCount: 5, matrixScore: 5 }
    ] as unknown as Awaited<ReturnType<typeof UniversHallPantheonOrchestrator.calculatePantheon>>);

    const req = new NextRequest('http://localhost/api/univershall/pantheon');
    const res = await GET(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.pantheon).toHaveLength(2);
    expect(json.pantheon[0].uid).toBe('bird_2');
    expect(json.pantheon[1].uid).toBe('bird_1');
    expect(UniversHallPantheonOrchestrator.calculatePantheon).toHaveBeenCalled();
  });
});
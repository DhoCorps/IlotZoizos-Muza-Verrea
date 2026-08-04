// apps/hub-central/__test__/api/demopraxy.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/demopraxy/evaluate/route';
import {DemopraxyOrchestrator} from '@ilot/shared-core'

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';

describe('API Demopraxy - Évaluation du Vortex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes des oiseaux non authentifiés', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/demopraxy/evaluate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'test-bird', metrics: { systemicHatredScore: 8, recurrenceCount: 3, recalibrationCapacity: 1, collectiveResonance: 0 } })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('🌑 doit appliquer la stase si le seuil critique (Ex >= 15) est atteint avec les bons droits', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { uid: 'architect-uid', capabilities: ['*'] }
    });

    // Test de la logique brute de l'orchestrateur via l'évaluation
    const metrics = { systemicHatredScore: 9, recurrenceCount: 2, recalibrationCapacity: 1, collectiveResonance: 0 };
    const evaluation = DemopraxyOrchestrator.evaluateSanctuarySafety(metrics);
    
    expect(evaluation.isExcluded).toBe(true);
    expect(evaluation.exScore).toBe(18.0);
  });
});
// apps/hub-central/__test__/api/task.resonance.api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/users/[slug]/resonance/route';
import { TaskResonanceOrchestrator } from '@ilot/shared-core';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';

describe('API Task Resonance - Résonance des Tâches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes non authentifiées', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/users/bird-1/resonance', {
      method: 'POST'
    });

    const res = await POST(req, { params: { userId: 'bird-1' } });
    expect(res.status).toBe(401);
  });

  it('🎶 doit calculer correctement la résonance unitaire et globale par l’orchestrateur', () => {
    const singleRz = TaskResonanceOrchestrator.calculateTaskResonance({
      estimatedTime: 4,
      realTime: 2,
      weight: 3
    });
    // (4 / 2) * 3 = 6
    expect(singleRz).toBe(6);

    const batchRz = TaskResonanceOrchestrator.calculateBatchResonance([
      { estimatedTime: 4, realTime: 2, weight: 3 },
      { estimatedTime: 2, realTime: 2, weight: 2 }
    ]);
    // 6 + (2/2)*2 = 8
    expect(batchRz).toBe(8);
  });
});
// apps/hub-central/__test__/api/task.resonance.api.test.ts
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/users/[slug]/resonance/route';
import { TaskResonanceOrchestrator } from '@ilot/shared-core';

// 🪡 SUTURE : On ajoute le double bouclier de mock pour connectToDatabase
const { mockConnectToDatabase } = vi.hoisted(() => ({
  mockConnectToDatabase: vi.fn().mockResolvedValue(true)
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mockConnectToDatabase,
}));

import { getServerSession } from 'next-auth/next';

describe('API Task Resonance - Résonance des Tâches', () => {
  // 🪡 SUTURE : Adaptation au standard Next.js 15 (Promesse de params avec le paramètre slug)
  const mockParams = { params: Promise.resolve({ slug: 'bird-1' }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes non authentifiées', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/users/bird-1/resonance', {
      method: 'POST'
    });

    // 🪡 SUTURE : Injection du bon format de paramètres
    const res = await POST(req as unknown as NextRequest, mockParams);
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
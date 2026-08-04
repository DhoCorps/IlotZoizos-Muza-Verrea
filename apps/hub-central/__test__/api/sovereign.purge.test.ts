// apps/hub-central/__test__/api/sovereign.purge.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/sovereign/purge/route';
import { SovereignPurgeOrchestrator } from '@ilot/shared-core';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';

describe('API Sovereign Purge - L’Évanescence & Le Terminus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes non authentifiées', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/sovereign/purge', {
      method: 'POST',
      body: JSON.stringify({ entityId: 'bird-exile-42', reason: 'VOLUNTARY_EXILE' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('💨 doit valider correctement l’évaluation de la dissolution par l’orchestrateur', () => {
    const shouldDissolve = SovereignPurgeOrchestrator.evaluateDissolution(-15, -10);
    expect(shouldDissolve).toBe(true);

    const payload = SovereignPurgeOrchestrator.buildPurgePayload({
      entityId: 'bird-exile-42',
      reason: 'VOLUNTARY_EXILE'
    });

    expect(payload.targetUid).toBe('bird-exile-42');
    expect(payload.action).toBe('PURGE_COMPLETE');
  });
});
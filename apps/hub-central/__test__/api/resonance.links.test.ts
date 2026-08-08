import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/resonance/links/route';
import { ResonanceOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

// Neutralisation de withAura pour éviter les erreurs de scope des headers Next.js en test unitaire
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = { id: '1', uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/shared-core', () => ({
  ResonanceOrchestrator: {
    weaveCrossDomainLink: vi.fn(),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Resonance Links (POST /api/resonance/links)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🔴 doit rejeter une requête avec un corps illisible ou malformé (400)', async () => {
    const req = new Request('http://localhost/api/resonance/links', {
      method: 'POST',
      body: '{ invalid-json ',
    });

    const res = await POST(req as any, {});
    expect(res.status).toBe(400);
  });

  it('🟢 doit forger un pont de résonance transdisciplinaire, appeler l\'orchestrateur et invalider le cache (201)', async () => {
    vi.mocked(ResonanceOrchestrator.weaveCrossDomainLink).mockResolvedValueOnce({
      linkId: 'link-uuid-123',
      status: 'woven',
    } as any);

    const payload = {
      sourceUid: 'task-1',
      sourceLabel: 'Task',
      targetUid: 'sujet-1',
      targetLabel: 'Sujet',
      relationType: 'INFLUENCES',
    };

    const req = new Request('http://localhost/api/resonance/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.linkId).toBe('link-uuid-123');

    // 🕸️ Vérification que l'orchestrateur reçoit bien la signature de l'Oiseau connecté
    expect(ResonanceOrchestrator.weaveCrossDomainLink).toHaveBeenCalledWith(
      'task-1',
      'Task',
      'sujet-1',
      'Sujet',
      'INFLUENCES',
      expect.objectContaining({ actorUid: 'u-123' })
    );

    // 💥 Vérification de l'invalidation chirurgicale du cache (globale + entités source et cible)
    expect(revalidateTag).toHaveBeenCalledWith('resonance-links');
    expect(revalidateTag).toHaveBeenCalledWith('entity-task-1');
    expect(revalidateTag).toHaveBeenCalledWith('entity-sujet-1');
  });
});
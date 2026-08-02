import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { SujetOrchestrator } from '@ilot/shared-core';

import { POST as fosterSujetRoute, GET as getSujetsRoute } from '../../app/api/sujets/route';
// 🪡 CORRECTION : Import depuis [slug] au lieu de [sujetId]
import { DELETE as deleteSujetRoute } from '../../app/api/sujets/[slug]/route';

// SUTURE OMEGA : vi.hoisted permet d'initialiser l'espion AVANT le hoisting des mocks
const { mockNeo4jRunSujet } = vi.hoisted(() => ({
  mockNeo4jRunSujet: vi.fn()
}));

// 1. MOCK DE LA DOUANE (NextAuth)
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

// 2. MOCK DE L'INFRASTRUCTURE (Silice & Graphe exportant SujetModel)
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRunSujet,
    close: vi.fn().mockResolvedValue(undefined)
  }),
  SujetModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ uid: 'sujet_1', title: 'Le premier chant', slug: 'le-premier-chant' }])
    }),
    findOne: vi.fn().mockResolvedValue({ uid: 'sujet_1', slug: 'le-premier-chant', authorUid: 'bird-alpha-001' }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 })
  }
}));

describe('API Sujets - La Bibliothèque et la Fondation', () => {
  const mockBirdUid = 'bird-alpha-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 POST /api/sujets doit retourner 201 et transmettre la fondation à l\'Orchestrateur', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { 
        uid: mockBirdUid, 
        capabilities: [] 
      } 
    } as any);

    const fosterSpy = vi.spyOn(SujetOrchestrator.prototype, 'fosterSujet')
      .mockResolvedValue({ success: true, status: 'success', mongo: { uid: 'sujet_1' }, neo4j: {} } as any);

    const req = new Request('http://localhost/api/sujets', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nouveau Monologue', content: 'Texte brut depuis la matrice.' }) 
    });

    const response = await fosterSujetRoute(req);
    
    expect(response.status).toBe(201);
    expect(fosterSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nouveau Monologue' }),
      expect.objectContaining({ actorUid: mockBirdUid })
    );
  });

  it('🔴 POST /api/sujets doit repousser les étrangers (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/sujets', {
      method: 'POST',
      body: JSON.stringify({ title: 'Intrusion', content: 'Hack de la Silice' }) 
    });

    const response = await fosterSujetRoute(req);
    expect(response.status).toBe(401);
  });

  it('🟢 GET /api/sujets doit retourner les sujets publics de la Silice', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/sujets');
    const response = await getSujetsRoute(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].slug).toBe('le-premier-chant');
  });

 it('🟢 DELETE /api/sujets doit transmettre la dissolution à l\'Orchestrateur avec la Signature', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: mockBirdUid, capabilities: ['*'] } 
    } as any);

    const dissolveSpy = vi.spyOn(SujetOrchestrator.prototype, 'disintegrateSujet')
      .mockResolvedValue({ success: true, purgedCount: 1 } as any);

    // 🪡 CORRECTION : On passe le slug en query parameter dans l'URL, et on appelle deleteSujetRoute avec un seul argument (req)
    const req = new Request(`http://localhost/api/sujets?slug=le-premier-chant`, { method: 'DELETE' });
    const response = await deleteSujetRoute(req);
    
    expect(response.status).toBe(200);
    expect(dissolveSpy).toHaveBeenCalledWith(
      'sujet_1', 
      expect.objectContaining({ actorUid: mockBirdUid })
    );
  });
});
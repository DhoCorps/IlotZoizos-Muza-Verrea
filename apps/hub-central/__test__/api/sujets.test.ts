// apps/hub-central/__test__/api/sujets.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from "next-auth/next";
import { SujetOrchestrator } from '@ilot/shared-core/src/sync-engine/sujet.orchestrator';
import { CAPABILITIES } from '@ilot/types';

import { POST as fosterSujetRoute, GET as getSujetsRoute } from '../../app/api/sujets/route';
import { DELETE as deleteSujetRoute } from '../../app/api/sujets/[sujetId]/route';

// SUTURE OMEGA : vi.hoisted permet d'initialiser l'espion AVANT le hoisting des mocks[cite: 14]
const { mockNeo4jRunSujet } = vi.hoisted(() => ({
  mockNeo4jRunSujet: vi.fn()
}));

// 1. MOCK DE LA DOUANE (NextAuth)[cite: 14]
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

// 2. MOCK DE L'INFRASTRUCTURE (Silice & Graphe)[cite: 14]
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  getNeo4jSession: vi.fn().mockReturnValue({
    run: mockNeo4jRunSujet,
    close: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock Spécifique de la Silice pour le GET[cite: 14]
vi.mock('@ilot/infrastructure/src/database/models/nosql/sujet.model', () => ({
  SujetModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ uid: 'sujet_1', title: 'Le premier chant' }])
    })
  }
}));

describe('API Sujets - La Bibliothèque et la Fondation', () => {
  const mockBirdUid = 'bird-alpha-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 POST /api/sujets doit retourner 201 et transmettre la fondation à l\'Orchestrateur', async () => {
    // SUTURE : On ajoute les capabilities à la session mockée pour passer la garde Auth[cite: 14]
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { 
        uid: mockBirdUid, 
        capabilities: [] // Pas de prérequis de territoire pour créer sa propre pensée
      } 
    } as any);

    // On spy l'Orchestrateur pour s'assurer que la route délègue bien le travail[cite: 14]
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
    // Simulation d'une absence de session[cite: 14]
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/sujets', {
      method: 'POST',
      body: JSON.stringify({ title: 'Intrusion', content: 'Hack de la Silice' }) 
    });

    const response = await fosterSujetRoute(req);
    expect(response.status).toBe(401);
  });

  it('🟢 GET /api/sujets doit retourner les sujets publics de la Silice', async () => {
    // Utilisateur anonyme
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new Request('http://localhost/api/sujets');
    const response = await getSujetsRoute(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe('Le premier chant');
  });

  it('🟢 DELETE /api/sujets/[sujetId] doit transmettre la dissolution à l\'Orchestrateur avec la Signature', async () => {
    // Oiseau avec l'Aura absolue[cite: 14]
    vi.mocked(getServerSession).mockResolvedValue({ 
      user: { uid: mockBirdUid, capabilities: ['*'] } 
    } as any);

    const dissolveSpy = vi.spyOn(SujetOrchestrator.prototype, 'disintegrateSujet')
      .mockResolvedValue({ success: true, purgedCount: 1 } as any);

    const req = new Request(`http://localhost/api/sujets/sujet_1`, { method: 'DELETE' });
    const response = await deleteSujetRoute(req, { params: { sujetId: 'sujet_1' } });
    
    expect(response.status).toBe(200);
    expect(dissolveSpy).toHaveBeenCalledWith(
      'sujet_1', 
      expect.objectContaining({ actorUid: mockBirdUid })
    );
  });
});
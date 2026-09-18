import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/teams/route';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécute immédiatement la fonction mise en cache
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser;
    if (!mockUser) {
      return NextResponse.json({ success: false, error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    find: vi.fn(),
  },
  getNeo4jSession: vi.fn().mockReturnValue({
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(true),
  }),
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Nids / Escouades (GET / POST /api/teams)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'fosterTeam').mockResolvedValue({
      success: true,
      uid: 'team-new',
    } as unknown as Awaited<ReturnType<TeamOrchestrator['fosterTeam']>>);
  });

  describe('GET - Recensement des Nids (Neo4j + Mongo)', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/teams');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste unifiée des nids pour un utilisateur connecté', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      // Simulation Neo4j : 1 nid trouvé, avec ses membres et invitations
      const mockNeoRun = vi.fn()
        .mockResolvedValueOnce({
          records: [{ get: (key: string) => key === 'teamUid' ? 't-1' : 'FOUNDED' }]
        }) // Étape 1 : relation user -> team
        .mockResolvedValueOnce({
          records: [{ get: (k: string) => k === 'uid' ? 'u-123' : k === 'pseudo' ? 'Alpha' : null }]
        }) // Étape 2 : membres
        .mockResolvedValueOnce({
          records: []
        }); // Étape 3 : invitations

      vi.mocked(getNeo4jSession).mockReturnValue({
        run: mockNeoRun,
        close: vi.fn().mockResolvedValue(true),
      } as unknown as ReturnType<typeof getNeo4jSession>);

      // Simulation MongoDB
      vi.mocked(TeamModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 't-1', name: 'Escouade Alpha', ownerUid: 'u-123' }]),
      } as unknown as ReturnType<typeof TeamModel.find>);

      const req = new NextRequest('http://localhost/api/teams');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('t-1');
      expect(json[0].members).toBeDefined();
    });
  });

  describe('POST - Fonder un Nid', () => {
    it('doit rejeter (403) si l\'utilisateur n\'a pas la capacité requise', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: ['READ_ONLY'] }; // Pas de droit TEAM:CREATE ni '*'

      const req = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Nid Interdit' }),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("Aura insuffisante");
    });

    it('doit réussir (201) la fondation d\'un Nid si l\'utilisateur a les droits, puis invalider le cache', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [CAPABILITIES.TEAM.CREATE] };

      const payload = { 
        name: 'Nid Céleste', 
        description: 'Un nouveau refuge',
        invitations: [],
        members: []
      };

      const req = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      const errorMessage = response.status !== 201 ? JSON.stringify(json, null, 2) : '';
      
      expect(response.status, `Route POST /api/teams a échoué avec 400. Erreur Zod : ${errorMessage}`).toBe(201);
      
      expect(json.uid).toBe('team-new');
      expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
      expect(revalidateTag).toHaveBeenCalledWith('teams');
    });
  });
});
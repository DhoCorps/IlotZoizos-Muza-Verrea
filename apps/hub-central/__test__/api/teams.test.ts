import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/teams/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES } from '@ilot/types';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécute immédiatement la fonction mise en cache
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
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

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Nids / Escouades (GET / POST /api/teams)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'fosterTeam').mockResolvedValue({
      success: true,
      uid: 'team-new',
    } as any);
  });

  describe('GET - Recensement des Nids (Neo4j + Mongo)', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams');
      const response = await GET(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit renvoyer (200) la liste unifiée des nids pour un utilisateur connecté', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

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
      } as any);

      // Simulation MongoDB
      vi.mocked(TeamModel.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 't-1', name: 'Escouade Alpha', ownerUid: 'u-123' }]),
      } as any);

      const req = new Request('http://localhost/api/teams');
      const response = await GET(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].uid).toBe('t-1');
      expect(json[0].members).toBeDefined();
    });
  });

  describe('POST - Fonder un Nid', () => {
    it('doit rejeter (403) si l\'utilisateur n\'a pas la capacité requise', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: ['READ_ONLY'] } // Pas de droit TEAM:CREATE ni '*'
      } as any);

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Nid Interdit' }),
      });

      const response = await POST(req as any, {});
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("Aura insuffisante");
    });

    it('doit réussir (201) la fondation d\'un Nid si l\'utilisateur a les droits, puis invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [CAPABILITIES.TEAM.CREATE] }
      } as any);

      const payload = { 
        name: 'Nid Céleste', 
        description: 'Un nouveau refuge',
        invitations: [],
        members: []
      };

      const req = new Request('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const response = await POST(req as any, {});
      const json = await response.json();

      const errorMessage = response.status !== 201 ? JSON.stringify(json, null, 2) : '';
      
      expect(response.status, `Route POST /api/teams a échoué avec 400. Erreur Zod : ${errorMessage}`).toBe(201);
      
      expect(json.uid).toBe('team-new');
      expect(revalidateTag).toHaveBeenCalledWith('teams-u-123');
      expect(revalidateTag).toHaveBeenCalledWith('teams');
    });
  });
});
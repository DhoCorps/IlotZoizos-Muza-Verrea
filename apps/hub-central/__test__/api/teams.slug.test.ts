import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/teams/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { TeamModel, getNeo4jSession } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES } from '@ilot/types';
import { revalidateTag } from 'next/cache';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécute immédiatement pour les tests
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TeamModel: {
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Nid Individuel (GET / PUT / DELETE /api/teams/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de TeamOrchestrator
    vi.spyOn(TeamOrchestrator.prototype, 'mutateTeam').mockResolvedValue({
      uid: 't-123',
      name: 'Nid Muté',
    } as any);

    vi.spyOn(TeamOrchestrator.prototype, 'dissolveTeam').mockResolvedValue(true as any);
  });

  describe('GET - Découverte du Nid', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request('http://localhost/api/teams/mon-nid');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit rejeter (403) si l\'oiseau n\'a pas les capacités de lecture sur le Nid', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 't-123', slug: 'mon-nid', name: 'Mon Nid' }),
      } as any);

      // Neo4j renvoie des capacités vides
      vi.mocked(getNeo4jSession).mockReturnValue({
        run: vi.fn().mockResolvedValue({ records: [] }),
        close: vi.fn().mockResolvedValue(true),
      } as any);

      const req = new Request('http://localhost/api/teams/mon-nid');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("Accès refusé");
    });

    it('doit réussir (200) et renvoyer le Nid avec les capacités si autorisé', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 't-123', slug: 'mon-nid', name: 'Mon Nid' }),
      } as any);

      // Neo4j renvoie le droit TEAM.READ
      vi.mocked(getNeo4jSession).mockReturnValue({
        run: vi.fn()
          .mockResolvedValueOnce({
            records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.READ] : 'MEMBER_OF' }]
          }) // getCapabilities
          .mockResolvedValueOnce({
            records: []
          }), // invitations
        close: vi.fn().mockResolvedValue(true),
      } as any);

      const req = new Request('http://localhost/api/teams/mon-nid');
      const response = await GET(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('t-123');
      expect(json.myCapabilities).toContain(CAPABILITIES.TEAM.READ);
    });
  });

  describe('PUT - Mutation du Nid', () => {
    it('doit réussir (200) la mutation si l\'utilisateur a le droit UPDATE et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 't-123', slug: 'mon-nid', name: 'Mon Nid' }),
      } as any);

      vi.mocked(getNeo4jSession).mockReturnValue({
        run: vi.fn().mockResolvedValue({
          records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.UPDATE] : 'FOUNDED' }]
        }),
        close: vi.fn().mockResolvedValue(true),
      } as any);

      const req = new Request('http://localhost/api/teams/mon-nid', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nid Muté' }),
      });

      const response = await PUT(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.name).toBe('Nid Muté');

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('teams');
      expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    });
  });

  describe('DELETE - Dissolution du Nid', () => {
    it('doit réussir (200) la dissolution si l\'utilisateur a le droit DELETE et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as any);

      vi.mocked(TeamModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 't-123', slug: 'mon-nid', name: 'Mon Nid' }),
      } as any);

      vi.mocked(getNeo4jSession).mockReturnValue({
        run: vi.fn().mockResolvedValue({
          records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.DELETE] : 'FOUNDED' }]
        }),
        close: vi.fn().mockResolvedValue(true),
      } as any);

      const req = new Request('http://localhost/api/teams/mon-nid', {
        method: 'DELETE',
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toContain("dissous");

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('teams');
      expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
    });
  });
});
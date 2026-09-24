import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/tom-hat-toes/teams/[slug]/route';
import { TeamModel, findEntityBySlugOrUid, getNeo4jSession } from '@ilot/infrastructure';
import { TeamOrchestrator } from '@ilot/shared-core';
import { CAPABILITIES } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécute immédiatement pour les tests
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

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    TeamModel: {
      findOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    findEntityBySlugOrUid: vi.fn(),
  };
});

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
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
describe('Route API : Nid Individuel (GET / PUT / DELETE /api/tom-hat-toes/teams/[slug])', () => {
  let mockNeoSession: { run: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    mockNeoSession = {
      run: vi.fn().mockResolvedValue({ records: [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession as unknown as ReturnType<typeof getNeo4jSession>);

    vi.spyOn(TeamOrchestrator.prototype, 'mutateTeam').mockResolvedValue({
      uid: 't-123',
      name: 'Nid Muté',
    } as unknown as Awaited<ReturnType<TeamOrchestrator['mutateTeam']>>);

    vi.spyOn(TeamOrchestrator.prototype, 'dissolveTeam').mockResolvedValue(true as unknown as Awaited<ReturnType<TeamOrchestrator['dissolveTeam']>>);
  });

  describe('GET - Découverte du Nid', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      delete global.__mockUser;

      const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid');
      const response = await GET(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe("Le Nexus est invisible aux étrangers.");
    });

    it('doit rejeter (403) si l\'oiseau n\'a pas les capacités de lecture sur le Nid et fermer la session Neo4j', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 't-123',
        slug: 'mon-nid',
        name: 'Mon Nid'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      mockNeoSession.run = vi.fn().mockResolvedValue({ records: [] });

      const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid');
      const response = await GET(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("Accès refusé");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');
      expect(mockNeoSession.close).toHaveBeenCalled(); // 🛡️ Vérification de la fermeture de session Neo4j
    });

    it('doit réussir (200) et renvoyer le Nid avec les capacités si autorisé', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 't-123',
        slug: 'mon-nid',
        name: 'Mon Nid'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      mockNeoSession.run = vi.fn()
        .mockResolvedValueOnce({
          records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.READ] : 'MEMBER_OF' }]
        })
        .mockResolvedValueOnce({
          records: []
        });

      const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid');
      const response = await GET(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('t-123');
      expect(json.myCapabilities).toContain(CAPABILITIES.TEAM.READ);
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');
      expect(mockNeoSession.close).toHaveBeenCalled(); // 🛡️ Vérification de la fermeture de session
    });
  });

  describe('PUT - Mutation du Nid', () => {
    it('doit réussir (200) la mutation si l\'utilisateur a le droit UPDATE, invalider le cache et fermer la session Neo4j', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 't-123',
        slug: 'mon-nid',
        name: 'Mon Nid'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      mockNeoSession.run = vi.fn().mockResolvedValue({
        records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.UPDATE] : 'FOUNDED' }]
      });

      const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nid Muté' }),
      });

      const response = await PUT(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.name).toBe('Nid Muté');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

      expect(revalidateTag).toHaveBeenCalledWith('teams');
      expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
      expect(revalidateTag).toHaveBeenCalledWith('team-t-123');
      expect(mockNeoSession.close).toHaveBeenCalled(); // 🛡️ Vérification de la fermeture de session
    });
  });

  describe('DELETE - Dissolution du Nid', () => {
    it('doit réussir (200) la dissolution si l\'utilisateur a le droit DELETE, invalider le cache et fermer la session', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 't-123',
        slug: 'mon-nid',
        name: 'Mon Nid'
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      mockNeoSession.run = vi.fn().mockResolvedValue({
        records: [{ get: (k: string) => k === 'caps' ? [CAPABILITIES.TEAM.DELETE] : 'FOUNDED' }]
      });

      const req = new NextRequest('http://localhost/api/tom-hat-toes/teams/mon-nid', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-nid' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toContain("dissous");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(TeamModel, 'mon-nid');

      expect(revalidateTag).toHaveBeenCalledWith('teams');
      expect(revalidateTag).toHaveBeenCalledWith('team-mon-nid');
      expect(revalidateTag).toHaveBeenCalledWith('team-t-123');
      expect(mockNeoSession.close).toHaveBeenCalled(); // 🛡️ Vérification de la fermeture de session
    });
  });
});
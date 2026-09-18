import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/projects/[slug]/route';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

// Neutralisation des gardes d'API pour les tests unitaires
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.UPDATE] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@/lib/cache/projects.cache', () => ({
  getCachedProjectDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    ProjectModel: {
      findOne: vi.fn(),
    },
    getNeo4jSession: vi.fn(),
    findEntityBySlugOrUid: vi.fn(async (model, identifier) => {
      const doc = await model.findOne({ $or: [{ slug: identifier }, { uid: identifier }] });
      if (!doc) return null;
      if (typeof doc.lean === 'function') {
        return await doc.lean();
      }
      return doc;
    }),
  };
});

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// Helper pour mocker les sessions Neo4j de vérification des capacités avec vérification du .close()
function mockNeo4jCaps(hasAccess: boolean = true, caps: string[] = [], rels: string[] = []) {
  const closeMock = vi.fn().mockResolvedValue(true);
  vi.mocked(getNeo4jSession).mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: hasAccess ? [{ get: (key: string) => key === 'compiledCaps' ? [caps] : rels }] : [],
    }),
    close: closeMock,
  } as unknown as ReturnType<typeof getNeo4jSession>);
  return closeMock;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Project [projectId] (GET / PUT / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(ProjectOrchestrator.prototype, 'mutateProject').mockResolvedValue({
      uid: 'proj-1',
      name: 'Projet Muté',
    } as unknown as Awaited<ReturnType<ProjectOrchestrator['mutateProject']>>);

    vi.spyOn(ProjectOrchestrator.prototype, 'dissolveProject').mockResolvedValue({
      success: true,
      purgedCount: 1,
    } as unknown as Awaited<ReturnType<ProjectOrchestrator['dissolveProject']>>);

    vi.spyOn(ProjectOrchestrator.prototype, 'appendFiles').mockResolvedValue(true as unknown as Awaited<ReturnType<ProjectOrchestrator['appendFiles']>>);
  });

  describe('GET - Auscultation du Chantier', () => {
    it('doit autoriser (200) la lecture d\'un projet public pour un visiteur anonyme', async () => {
      delete global.__mockUser;

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', slug: 'proj-1', visibility: 'PUBLIC', creatorUid: 'u-other' }),
      } as unknown as ReturnType<typeof ProjectModel.findOne>);

      const req = new NextRequest('http://localhost/api/projects/proj-1');
      const response = await GET(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('proj-1');
    });

    it('doit refuser (403) l\'accès à un projet privé sans permissions et fermer la session Neo4j', async () => {
      global.__mockUser = { uid: 'u-intruder', capabilities: [] };
      const closeMock = mockNeo4jCaps(false);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-priv', slug: 'proj-priv', visibility: 'PRIVATE', creatorUid: 'u-owner' }),
      } as unknown as ReturnType<typeof ProjectModel.findOne>);

      const req = new NextRequest('http://localhost/api/projects/proj-priv');
      const response = await GET(req, { params: Promise.resolve({ projectId: 'proj-priv' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("protégé");
      expect(closeMock).toHaveBeenCalledTimes(1); // 🛡️ Vérification de la sécurité de la session
    });
  });

  describe('PUT - Mutation du Chantier', () => {
    it('doit réussir (200) si l\'utilisateur a l\'aura requise, invalider le cache et fermer la session Neo4j', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.UPDATE] };
      const closeMock = mockNeo4jCaps(true, ['project:update']);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', slug: 'proj-1', creatorUid: 'u-other' }),
      } as unknown as ReturnType<typeof ProjectModel.findOne>);

      const req = new NextRequest('http://localhost/api/projects/proj-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nouveau Nom' }),
      });

      const response = await PUT(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.name).toBe('Projet Muté');

      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
      expect(closeMock).toHaveBeenCalledTimes(1); // 🛡️ Vérification de la fermeture session
    });
  });

  describe('DELETE - Dissolution du Chantier', () => {
    it('doit réussir (200) si l\'utilisateur est le créateur, invalider le cache et fermer la session', async () => {
      global.__mockUser = { uid: 'u-creator', capabilities: [] };
      const closeMock = mockNeo4jCaps(false);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', slug: 'proj-1', creatorUid: 'u-creator' }),
      } as unknown as ReturnType<typeof ProjectModel.findOne>);

      const req = new NextRequest('http://localhost/api/projects/proj-1', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.status).toBe('dissolved');

      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
      expect(closeMock).toHaveBeenCalledTimes(1); // 🛡️ Vérification de la fermeture session
    });
  });
});
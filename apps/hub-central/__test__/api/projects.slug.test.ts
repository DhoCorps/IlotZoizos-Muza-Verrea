import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/projects/[slug]/route';
import { ProjectModel, getNeo4jSession } from '@ilot/infrastructure';
import { ProjectOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { CAPABILITIES } from '@ilot/types';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

// Neutralisation des gardes d'API pour les tests unitaires
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, context: any) => {
    return await handler(req, context, global.__mockUser);
  },
  withAura: (handler: any) => async (req: any, context: any) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.UPDATE] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProjectModel: {
    findOne: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

// Variable globale pour simuler l'utilisateur connecté dans les tests
declare global {
  var __mockUser: any;
}

// Helper pour mocker les sessions Neo4j de vérification des capacités
function mockNeo4jCaps(hasAccess: boolean = true, caps: string[] = [], rels: string[] = []) {
  vi.mocked(getNeo4jSession).mockReturnValue({
    run: vi.fn().mockResolvedValue({
      records: hasAccess ? [{ get: (key: string) => key === 'compiledCaps' ? [caps] : rels }] : [],
    }),
    close: vi.fn().mockResolvedValue(true),
  } as any);
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Project [projectId] (GET / PUT / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de ProjectOrchestrator
    vi.spyOn(ProjectOrchestrator.prototype, 'mutateProject').mockResolvedValue({
      uid: 'proj-1',
      name: 'Projet Muté',
    } as any);

    vi.spyOn(ProjectOrchestrator.prototype, 'dissolveProject').mockResolvedValue({
      success: true,
      purgedCount: 1,
    } as any);

    vi.spyOn(ProjectOrchestrator.prototype, 'appendFiles').mockResolvedValue(true as any);
  });

  describe('GET - Auscultation du Chantier', () => {
    it('doit autoriser (200) la lecture d\'un projet public pour un visiteur anonyme', async () => {
      global.__mockUser = undefined;

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        select: () => ({
          lean: vi.fn().mockResolvedValue({ uid: 'proj-1', visibility: 'PUBLIC', creatorUid: 'u-other' }),
        }),
      } as any);

      const req = new Request('http://localhost/api/projects/proj-1');
      const response = await GET(req as any, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('proj-1');
    });

    it('doit refuser (403) l\'accès à un projet privé sans permissions', async () => {
      global.__mockUser = { uid: 'u-intruder', capabilities: [] };
      mockNeo4jCaps(false);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        select: () => ({
          lean: vi.fn().mockResolvedValue({ uid: 'proj-priv', visibility: 'PRIVATE', creatorUid: 'u-owner' }),
        }),
      } as any);

      const req = new Request('http://localhost/api/projects/proj-priv');
      const response = await GET(req as any, { params: Promise.resolve({ projectId: 'proj-priv' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("protégé");
    });
  });

  describe('PUT - Mutation du Chantier', () => {
    it('doit réussir (200) si l\'utilisateur a l\'aura requise et invalider le cache', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.UPDATE] };
      mockNeo4jCaps(true, ['project:update']);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', creatorUid: 'u-other' }),
      } as any);

      const req = new Request('http://localhost/api/projects/proj-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Nouveau Nom' }),
      });

      const response = await PUT(req as any, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.name).toBe('Projet Muté');

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
    });
  });

  describe('DELETE - Dissolution du Chantier', () => {
    it('doit réussir (200) si l\'utilisateur est le créateur et invalider le cache', async () => {
      global.__mockUser = { uid: 'u-creator', capabilities: [] };
      mockNeo4jCaps(false);

      vi.mocked(ProjectModel.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ uid: 'proj-1', creatorUid: 'u-creator' }),
      } as any);

      const req = new Request('http://localhost/api/projects/proj-1', {
        method: 'DELETE',
      });

      const response = await DELETE(req as any, { params: Promise.resolve({ projectId: 'proj-1' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.status).toBe('dissolved');

      // 💥 Vérification de l'invalidation du cache en cascade
      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('project-proj-1');
    });
  });
});
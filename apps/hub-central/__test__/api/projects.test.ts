import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/projects/route';
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
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.CREATE] };
    return await handler(req, context, mockUser);
  },
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProjectModel: {
    find: vi.fn(),
  },
  getNeo4jSession: vi.fn(),
}));

// Définition globale pour manipuler l'utilisateur dans les tests
declare global {
  var __mockUser: any;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Projects (GET / POST /api/projects)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de ProjectOrchestrator
    vi.spyOn(ProjectOrchestrator.prototype, 'fosterProject').mockResolvedValue({
      success: true,
      uid: 'proj-new-1',
      name: 'Nouveau Chantier',
    } as any);
  });

  describe('GET - Consultation de la Clairière (Projets)', () => {
    it('doit renvoyer les projets publics pour un visiteur anonyme', async () => {
      global.__mockUser = undefined;

      const mockLean = vi.fn().mockResolvedValue([{ uid: 'p-1', name: 'Projet Public', visibility: 'PUBLIC' }]);
      vi.mocked(ProjectModel.find).mockReturnValue({
        select: () => ({
          sort: () => ({
            limit: () => ({ lean: mockLean }),
          }),
        }),
      } as any);

      const req = new Request('http://localhost/api/projects');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(['ProjetPublic', 'Projet Public']).toContain(json[0].name);
    });

    it('doit interroger Neo4j pour récupérer les projets liés si un utilisateur est connecté', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      const mockNeoRun = vi.fn().mockResolvedValue({
        records: [{ get: () => 'p-private' }],
      });
      const mockNeoClose = vi.fn().mockResolvedValue(true);

      vi.mocked(getNeo4jSession).mockReturnValue({
        run: mockNeoRun,
        close: mockNeoClose,
      } as any);

      const mockLean = vi.fn().mockResolvedValue([{ uid: 'p-private', name: 'Projet Privé Lié' }]);
      vi.mocked(ProjectModel.find).mockReturnValue({
        select: () => ({
          sort: () => ({
            limit: () => ({ lean: mockLean }),
          }),
        }),
      } as any);

      const req = new Request('http://localhost/api/projects');
      const res = await GET(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockNeoRun).toHaveBeenCalled();
      expect(json).toHaveLength(1);
    });
  });

  describe('POST - Fondation d\'un Chantier', () => {
    it('doit refuser (403) si l\'Oiseau n\'a pas la capacité de créer un projet', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Mon Chantier Interdit' }),
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain("Aura insuffisante");
    });

    it('doit réussir (201) la création d\'un chantier si l\'Aura est suffisante et invalider le cache', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.CREATE] };

      const req = new Request('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Chantier de la Canopée', description: 'Exploration...' }),
      });

      const res = await POST(req as any, {});
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.uid).toBe('proj-new-1');

      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('projects-user-u-123');
    });
  });
});
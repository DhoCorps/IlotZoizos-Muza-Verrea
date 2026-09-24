import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/tom-hat-toes/projects/route';
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
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.CREATE] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
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
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Projects (GET / POST /api/tom-hat-toes/projects)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de ProjectOrchestrator
    vi.spyOn(ProjectOrchestrator.prototype, 'fosterProject').mockResolvedValue({
      success: true,
      uid: 'proj-new-1',
      name: 'Nouveau Chantier',
    } as unknown as Awaited<ReturnType<ProjectOrchestrator['fosterProject']>>);
  });

  describe('GET - Consultation de la Clairière (Projets)', () => {
    it('doit renvoyer les projets publics pour un visiteur anonyme', async () => {
      delete global.__mockUser;

      const mockLean = vi.fn().mockResolvedValue([{ uid: 'p-1', name: 'Projet Public', visibility: 'PUBLIC' }]);
      vi.mocked(ProjectModel.find).mockReturnValue({
        select: () => ({
          sort: () => ({
            limit: () => ({ lean: mockLean }),
          }),
        }),
      } as unknown as ReturnType<typeof ProjectModel.find>);

      const req = new NextRequest('http://localhost/api/tom-hat-toes/projects');
      const res = await GET(req, { params: Promise.resolve({}) });
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
      } as unknown as ReturnType<typeof getNeo4jSession>);

      const mockLean = vi.fn().mockResolvedValue([{ uid: 'p-private', name: 'Projet Privé Lié' }]);
      vi.mocked(ProjectModel.find).mockReturnValue({
        select: () => ({
          sort: () => ({
            limit: () => ({ lean: mockLean }),
          }),
        }),
      } as unknown as ReturnType<typeof ProjectModel.find>);

      const req = new NextRequest('http://localhost/api/tom-hat-toes/projects');
      const res = await GET(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockNeoRun).toHaveBeenCalled();
      expect(json).toHaveLength(1);
    });
  });

  describe('POST - Fondation d\'un Chantier', () => {
    it('doit refuser (403) si l\'Oiseau n\'a pas la capacité de créer un projet', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [] };

      const req = new NextRequest('http://localhost/api/tom-hat-toes/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Mon Chantier Interdit' }),
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain("Aura insuffisante");
    });

    it('doit réussir (201) la création d\'un chantier si l\'Aura est suffisante et invalider le cache', async () => {
      global.__mockUser = { uid: 'u-123', capabilities: [CAPABILITIES.PROJECT.CREATE] };

      const req = new NextRequest('http://localhost/api/tom-hat-toes/projects', {
        method: 'POST',
        body: JSON.stringify({ name: 'Chantier de la Canopée', description: 'Exploration...' }),
      });

      const res = await POST(req, { params: Promise.resolve({}) });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.uid).toBe('proj-new-1');

      expect(revalidateTag).toHaveBeenCalledWith('projects');
      expect(revalidateTag).toHaveBeenCalledWith('projects-user-u-123');
      expect(revalidateTag).toHaveBeenCalledWith('projects-user-public');
    });
  });
});
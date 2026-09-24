import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/abyss-blog/sujets/route';
import { getServerSession } from 'next-auth/next';
import { SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Neutralisation des api-guards
vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const session = await getServerSession();
    const currentUser = session?.user;
    return await handler(req, context, currentUser);
  },
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const session = await getServerSession();
    const currentUser = session?.user;
    if (!currentUser) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }
    return await handler(req, context, currentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  SujetModel: {
    find: vi.fn(),
  },
}));

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Bibliothèque & Sujets (GET / POST /api/abyss-blog/sujets)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de SujetOrchestrator
    vi.spyOn(SujetOrchestrator.prototype, 'fosterSujet').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: {
        uid: 'sujet-new',
        title: 'Nouvelle Pensée',
      } as any,
      neo4j: null,
    });
  });

  describe('GET - Consultation de la Bibliothèque', () => {
    it('doit renvoyer les sujets publiés pour un visiteur anonyme (sans session)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      vi.mocked(SujetModel.find).mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: vi.fn().mockResolvedValue([{ uid: 's-1', title: 'Sujet Public' }]),
          }),
        }),
      } as unknown as ReturnType<typeof SujetModel.find>);

      const req = new NextRequest('http://localhost/api/abyss-blog/sujets');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
      expect(json[0].title).toBe('Sujet Public');
    });

    it('doit intégrer les sujets de l\'auteur connecté si une session est active', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as unknown as Awaited<ReturnType<typeof getServerSession>>);

      const mockLean = vi.fn().mockResolvedValue([{ uid: 's-2', title: 'Mon Sujet Privé' }]);
      vi.mocked(SujetModel.find).mockReturnValue({
        sort: () => ({
          limit: () => ({ lean: mockLean }),
        }),
      } as unknown as ReturnType<typeof SujetModel.find>);

      const req = new NextRequest('http://localhost/api/abyss-blog/sujets');
      const response = await GET(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json).toHaveLength(1);
    });
  });

  describe('POST - Fondation d\'un Nœud de Pensée', () => {
    it('doit rejeter (401) si l\'utilisateur n\'a pas d\'Aura', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/abyss-blog/sujets', {
        method: 'POST',
        body: JSON.stringify({ title: 'Mon Idée', content: 'Substance...' }),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect([
      "Le Nexus est invisible aos étrangers.",
      "Le Nexus est invisible aux étrangers."
      ]).toContain(json.error);
    });

    it('doit réussir (201) la création d\'un sujet, exécuter l\'orchestrateur et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-123', capabilities: [] }
      } as unknown as Awaited<ReturnType<typeof getServerSession>>);

      const req = new NextRequest('http://localhost/api/abyss-blog/sujets', {
        method: 'POST',
        body: JSON.stringify({ title: 'La conscience de l\'Îlot', content: 'Contenu profond...' }),
      });

      const response = await POST(req, { params: Promise.resolve({}) });
      const json = await response.json();

      expect(response.status).toBe(201);
      // L'orchestrateur renvoie l'objet enveloppé `{ success, status, mongo, neo4j }`
      expect(json.mongo.uid).toBe('sujet-new');

      // 💥 Vérification de l'invalidation chirurgicale du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujets-user-u-123');
      expect(revalidateTag).toHaveBeenCalledWith('sujets-user-public');
    });
  });
});
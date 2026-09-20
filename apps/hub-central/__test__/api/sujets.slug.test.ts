import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/sujets/[slug]/route';
import { getServerSession } from 'next-auth/next';
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
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

vi.mock('@/lib/cache/sujets.cache', () => ({
  getCachedSujetDetails: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/slugify', () => ({
  slugify: vi.fn((val: string) => val?.toLowerCase().trim().replace(/\s+/g, '-') || ''),
}));

// Neutralisation des api-guards avec gestion d'erreur centralisée
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
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return await handler(req, context, currentUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    connectToDatabase: vi.fn().mockResolvedValue(true),
    SujetModel: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      deleteOne: vi.fn(),
    },
    // 🛡️ Protocole appliqué : Mock direct du helper unifié centralisé
    findEntityBySlugOrUid: vi.fn(),
  };
});

// Mock complet du SujetOrchestrator
vi.mock('@ilot/shared-core', () => {
  return {
    SujetOrchestrator: class {
      async updateSujet() {
        return {
          success: true,
          status: 'success',
          mongo: { uid: 's-1', title: 'Titre Modifié', slug: 'mon-sujet' },
          neo4j: null,
        };
      }
      async disintegrateSujet() {
        return { success: true, purgedCount: 1 };
      }
    },
    IlotError: class extends Error {
      statusCode: number;
      constructor(message: string, code: string, status: number) {
        super(message);
        this.statusCode = status;
      }
    }
  };
});

// -------------------------------------------------------------------------
// 🧪 SUITE DE TESTS
// -------------------------------------------------------------------------
describe('Route API : Sujet Individuel ([slug]) (GET / PUT / DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - Auscultation du Sujet', () => {
    it('doit autoriser (200) la lecture si le sujet est publié (visiteur anonyme)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      // Utilisation du helper unifié mocké pour le GET
      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        status: 'PUBLISHED',
        authorUid: 'u-999',
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/sujets/mon-sujet');
      const response = await GET(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.uid).toBe('s-1');
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');
    });

    it('doit refuser (403) l\'accès à un sujet privé pour un utilisateur non autorisé', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-other', capabilities: [] }
      } as unknown as Awaited<ReturnType<typeof getServerSession>>);

      vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
        uid: 's-1',
        slug: 'mon-sujet',
        status: 'DRAFT',
        authorUid: 'u-owner',
      } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

      const req = new NextRequest('http://localhost/api/sujets/mon-sujet');
      const response = await GET(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toContain("intime t'est fermé");
      expect(findEntityBySlugOrUid).toHaveBeenCalledWith(SujetModel, 'mon-sujet');
    });
  });

  describe('PUT - Mutation du Sujet', () => {
    it('doit réussir (200) en passant par l\'Orchestrator, valider via Zod et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-owner', capabilities: [] }
      } as unknown as Awaited<ReturnType<typeof getServerSession>>);

      const req = new NextRequest('http://localhost/api/sujets/mon-sujet', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Titre Modifié', media: { coverImageUrl: 'https://cdn.ilot/cover.jpg' } }),
      });

      const response = await PUT(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    });
  });

  describe('DELETE - Désintégration du Sujet', () => {
    it('doit réussir (200) via l\'Orchestrateur et invalider le cache', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { uid: 'u-owner', capabilities: [] }
      } as unknown as Awaited<ReturnType<typeof getServerSession>>);

      const req = new NextRequest('http://localhost/api/sujets/mon-sujet', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ slug: 'mon-sujet' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      // 💥 Vérification de l'invalidation du cache
      expect(revalidateTag).toHaveBeenCalledWith('sujets');
      expect(revalidateTag).toHaveBeenCalledWith('sujet-mon-sujet');
    });
  });
});
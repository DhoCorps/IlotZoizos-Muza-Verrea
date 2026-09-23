import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/annotations/route';
import { AnnotationModel } from '@ilot/infrastructure';
import { UniversalCommentOrchestrator } from '@ilot/shared-core';
import { getCachedBookAnnotations } from '@/lib/cache/bibliotek.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/bibliotek.cache', () => ({
  getCachedBookAnnotations: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withOptionalAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      // @ts-ignore
      return await handler(req, context, global.__mockUser);
    },
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: 'Accès non autorisé.' }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, context, mockUser);
    },
  };
});

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    AnnotationModel: {
      find: vi.fn(),
      countDocuments: vi.fn(),
      create: vi.fn(),
    },
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Bibliotek - Annotations Globales (/annotations)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    // 🌟 ESPIONNAGE DU PROTOTYPE (La méthode sûre pour mocker une classe sous Vitest)
    vi.spyOn(UniversalCommentOrchestrator.prototype, 'fosterComment').mockResolvedValue({
      success: true,
      isJackpot: false,
      mongo: { uid: 'mocked_resonance' } as any,
      neo4j: {} as any
    });
  });

  it('🟢 GET : doit lister toutes les notes de l\'Oiseau connecté avec métadonnées de pagination', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    vi.mocked(AnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { uid: 'annot_1', selectedText: 'Une belle phrase', bookUid: 'book_123' }
        ])
      })
    } as unknown as ReturnType<typeof AnnotationModel.find>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations?page=1&limit=15');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].bookUid).toBe('book_123');
    expect(json.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 15,
      totalPages: 1
    });
  });

  it('🟢 POST : doit vérifier la résonance via l\'Orchestrateur et consigner la note (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    vi.mocked(AnnotationModel.create).mockResolvedValueOnce({
      uid: 'annot_new',
      selectedText: 'Le conatus persiste',
      importance: 2
    } as unknown as Awaited<ReturnType<typeof AnnotationModel.create>>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations', {
      method: 'POST',
      body: JSON.stringify({
        bookUid: 'book_999',
        bookTitle: 'Traité de Philosophie',
        selectedText: 'Le conatus persiste',
        importance: 2,
        comment: 'Remarque essentielle'
      })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('annot_new');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-annotations');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-annotations-bird_reader');
  });

  it('🔴 POST : doit rejeter si l\'Orchestrateur Universel refuse la résonance (ex: pas d\'acte d\'amour)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    // On simule un rejet de l'orchestrateur spécifiquement pour ce test
    vi.spyOn(UniversalCommentOrchestrator.prototype, 'fosterComment').mockRejectedValueOnce({
      status: 403,
      message: "Le droit de critiquer s'achète par un acte d'amour."
    });

    const req = new NextRequest('http://localhost:3000/api/bibliotek/annotations', {
      method: 'POST',
      body: JSON.stringify({
        bookUid: 'book_999',
        bookTitle: 'Traité de Philosophie',
        selectedText: 'Texte sans amour',
      })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("acte d'amour");
    
    // On s'assure que la note n'a pas été créée en base locale
    expect(AnnotationModel.create).not.toHaveBeenCalled();
  });
});
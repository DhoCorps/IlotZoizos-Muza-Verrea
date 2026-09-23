import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/[slug]/annotations/route';
import { AnnotationModel, LibraryBookModel } from '@ilot/infrastructure';
import { UniversalCommentOrchestrator } from '@ilot/shared-core';
import { getCachedBook } from '@/lib/cache/bibliotek.cache';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/cache/bibliotek.cache', () => ({
  getCachedBook: vi.fn(),
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
    LibraryBookModel: {
      findOne: vi.fn(),
    },
    AnnotationModel: {
      find: vi.fn(),
      create: vi.fn(),
    },
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Sous-route Annotations ([slug]/annotations)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(UniversalCommentOrchestrator.prototype, 'fosterComment').mockResolvedValue({
      success: true,
      isJackpot: false,
      mongo: { uid: 'mocked_resonance' } as any,
      neo4j: {} as any
    });
  });

  it('🟢 GET : doit lister les notes associées au livre par son slug via le cache', async () => {
    vi.mocked(getCachedBook).mockResolvedValueOnce({
      uid: 'book_999',
      title: 'Traité'
    } as any);

    vi.mocked(AnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'annot_1', selectedText: 'Extrait Spinoza' }])
      })
    } as unknown as ReturnType<typeof AnnotationModel.find>);

    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(getCachedBook).toHaveBeenCalledWith('traite');
    expect(json.data).toHaveLength(1);
    expect(json.data[0].selectedText).toBe('Extrait Spinoza');
  });

  it('🟢 POST : doit vérifier la résonance via l\'Orchestrateur et consigner la note rattachée au livre (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'book_999',
        title: 'Traité de Philosophie'
      })
    } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

    vi.mocked(AnnotationModel.create).mockResolvedValueOnce({
      uid: 'annot_new',
      selectedText: 'Le conatus persiste',
      importance: 2
    } as unknown as Awaited<ReturnType<typeof AnnotationModel.create>>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations', {
      method: 'POST',
      body: JSON.stringify({
        selectedText: 'Le conatus persiste',
        importance: 2,
        comment: 'Remarque essentielle'
      })
    });

    const res = await postHandler(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.uid).toBe('annot_new');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-annotations');
    
    expect(UniversalCommentOrchestrator.prototype.fosterComment).toHaveBeenCalledWith(
      expect.objectContaining({ targetUid: 'book_999' }),
      expect.any(Object)
    );
  });

  it('🔴 POST : doit rejeter si l\'Orchestrateur Universel refuse la résonance (ex: pas d\'acte d\'amour)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'book_999',
        title: 'Traité de Philosophie'
      })
    } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

    vi.spyOn(UniversalCommentOrchestrator.prototype, 'fosterComment').mockRejectedValueOnce({
      status: 403,
      message: "Le droit de critiquer s'achète par un acte d'amour."
    });

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations', {
      method: 'POST',
      body: JSON.stringify({
        selectedText: 'Texte sans amour',
      })
    });

    const res = await postHandler(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("acte d'amour");

    expect(AnnotationModel.create).not.toHaveBeenCalled();
  });
});
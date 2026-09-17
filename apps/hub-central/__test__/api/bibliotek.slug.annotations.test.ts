import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/bibliotek/[slug]/annotations/route';
import { AnnotationModel, LibraryBookModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards'; // 🛡️ Import explicite pour éliminer l'erreur ApiContext

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
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
  // 🛡️ Harmonisation stricte de la signature d'index pour correspondre à auth.user.update.test.ts
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Sous-route Annotations ([slug]/annotations)', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🟢 GET : doit lister les notes associées au livre par son slug', async () => {
    vi.mocked(LibraryBookModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        uid: 'book_999',
        title: 'Traité'
      })
    } as unknown as ReturnType<typeof LibraryBookModel.findOne>);

    vi.mocked(AnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'annot_1', selectedText: 'Extrait Spinoza' }])
      })
    } as unknown as ReturnType<typeof AnnotationModel.find>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/traite/annotations');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'traite' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].selectedText).toBe('Extrait Spinoza');
  });

  it('🟢 POST : doit créer une note rattachée au livre résolu par son slug (201)', async () => {
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
  });
});
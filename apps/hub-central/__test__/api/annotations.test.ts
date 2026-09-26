import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/annotations/route';
import { UniversalAnnotationModel } from '@ilot/infrastructure';
import { AnnotationOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

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
    UniversalAnnotationModel: {
      find: vi.fn(),
    },
  };
});

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Universelle : /api/annotations', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(AnnotationOrchestrator.prototype, 'fosterAnnotation').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { uid: 'annot_new', selectedText: 'Le conatus persiste' },
      neo4j: {} as any
    });
  });

  it('🟢 GET : doit lister les annotations selon les filtres de recherche (ex: targetUid)', async () => {
    vi.mocked(UniversalAnnotationModel.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ uid: 'annot_1', selectedText: 'Extrait Article' }] )
      })
    } as unknown as ReturnType<typeof UniversalAnnotationModel.find>);

    const req = new NextRequest('http://localhost:3000/api/annotations?targetUid=article_123&targetType=ARTICLE');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].selectedText).toBe('Extrait Article');
  });

  it('🟢 POST : doit passer par l\'AnnotationOrchestrator et consigner une note universelle (201)', async () => {
    global.__mockUser = { uid: 'bird_reader', capabilities: [] };

    const req = new NextRequest('http://localhost:3000/api/annotations', {
      method: 'POST',
      body: JSON.stringify({
        targetUid: 'article_123',
        targetType: 'ARTICLE',
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
    expect(revalidateTag).toHaveBeenCalledWith('annotations');
    expect(revalidateTag).toHaveBeenCalledWith('annotations-article_123');
    
    expect(AnnotationOrchestrator.prototype.fosterAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({ targetUid: 'article_123', targetType: 'ARTICLE' }),
      expect.any(Object)
    );
  });
});
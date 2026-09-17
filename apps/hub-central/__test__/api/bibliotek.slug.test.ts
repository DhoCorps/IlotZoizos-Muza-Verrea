import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '@/app/api/bibliotek/[slug]/route';
import { LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { BibliotekOrchestrator } from '@ilot/shared-core';
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
    LibraryBookModel: {
      findOne: vi.fn(),
    },
    findEntityBySlugOrUid: vi.fn(),
  };
});

declare global {
  // 🛡️ Harmonisation stricte de la signature d'index globale de __mockUser
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<{ slug?: string | string[] }> }) => Promise<Response>;

describe('API Bibliotek - Ouvrage Individuel ([slug])', () => {
  const getHandler = GET as unknown as RouteHandler;
  const putHandler = PUT as unknown as RouteHandler;
  const deleteHandler = DELETE as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;

    vi.spyOn(BibliotekOrchestrator.prototype, 'updateBook').mockResolvedValue({
      success: true,
      status: 'success',
      mongo: { uid: 'book_999', slug: 'essai-sur-la-silice-mut', title: 'Titre Muté' },
      neo4j: {}
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['updateBook']>>);

    vi.spyOn(BibliotekOrchestrator.prototype, 'disintegrateBook').mockResolvedValue({
      success: true,
      purgedCount: 1,
    } as unknown as Awaited<ReturnType<BibliotekOrchestrator['disintegrateBook']>>);
  });

  it('🟢 GET : doit retourner les détails d’un ouvrage par son slug via le résolveur', async () => {
    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_999', 
      title: 'Essai sur la Silice', 
      authorUid: 'bird_writer', 
      copyrightClaimed: true,
      toObject: () => ({ uid: 'book_999', title: 'Essai sur la Silice', authorUid: 'bird_writer', copyrightClaimed: true })
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice');
    const res = await getHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.title).toBe('Essai sur la Silice');
    expect(findEntityBySlugOrUid).toHaveBeenCalledWith(LibraryBookModel, 'essai-sur-la-silice');
  });

  it('🔴 PUT : doit rejeter (401) si l’Oiseau n’est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Nouveau Titre' })
    });

    const res = await putHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    expect(res.status).toBe(401);
  });

  it('🟢 PUT : doit muter l’ouvrage avec succès (200) avec son UID canonique', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_canonique_123', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Titre Muté' })
    });

    const res = await putHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mongo.title).toBe('Titre Muté');
    expect(BibliotekOrchestrator.prototype.updateBook).toHaveBeenCalledWith('book_canonique_123', expect.any(Object), expect.any(Object));
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-book_999');
  });

  it('🟢 DELETE : doit dissoudre l’ouvrage avec succès (200) avec son UID canonique', async () => {
    global.__mockUser = { uid: 'bird_writer', capabilities: [] };

    vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({ 
      uid: 'book_canonique_123', 
      slug: 'essai-sur-la-silice',
      authorUid: 'bird_writer' 
    } as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

    const req = new NextRequest('http://localhost:3000/api/bibliotek/essai-sur-la-silice', {
      method: 'DELETE'
    });

    const res = await deleteHandler(req, { params: Promise.resolve({ slug: 'essai-sur-la-silice' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(BibliotekOrchestrator.prototype.disintegrateBook).toHaveBeenCalledWith('book_canonique_123', expect.any(Object));
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-essai-sur-la-silice');
    expect(revalidateTag).toHaveBeenCalledWith('bibliotek-book_canonique_123');
  });
});